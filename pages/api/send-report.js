// pages/api/send-report.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Mailchimp helper ──────────────────────────────────────────────────────────
async function subscribeToMailchimp(email) {
  const apiKey   = process.env.MAILCHIMP_API_KEY;
  const listId   = process.env.MAILCHIMP_LIST_ID;

  if (!apiKey || !listId) {
    console.warn("Mailchimp env vars not set — skipping subscription.");
    return;
  }

  // The data-center is the suffix after the last dash in the API key (e.g. "us21")
  const dc = apiKey.split("-").pop();
  const url = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Mailchimp accepts "anystring:apikey" as Basic auth
      Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
    },
    body: JSON.stringify({
      email_address: email,
      status: "subscribed",   // use "pending" if you want double opt-in
      tags: ["future-face-app"],
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    // 400 + title "Member Exists" is fine — user is already on the list
    if (data.title !== "Member Exists") {
      throw new Error(`Mailchimp error: ${data.detail || data.title}`);
    }
  }
}
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, analysis, userAge: rawAge, marketing } = req.body;
  const userAge = parseInt(rawAge);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email address." });
  }
  if (!analysis || !userAge) {
    return res.status(400).json({ error: "Missing analysis data." });
  }

  try {
    // 1. Send the skin-snapshot email (always)
    await transporter.sendMail({
      from: `"Future Face" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: "Your Future Face Skin Snapshot",
      html: buildEmailHTML(analysis, userAge),
    });

    // 2. Subscribe to Mailchimp only when the user opted in
    if (marketing) {
      await subscribeToMailchimp(email);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("send-report error:", err);
    return res.status(500).json({ error: "Failed to send email." });
  }
}

function buildEmailHTML(analysis, userAge) {
  const diff    = parseInt(analysis.skinAge) - parseInt(userAge);
  const diffAbs = Math.abs(diff);
  const diffCol = diff > 3 ? "#C62828" : diff < -3 ? "#2D7A2D" : "#B07D20";
  const diffLabel = diff === 0 ? "Match" : diff > 0 ? "Older" : "Younger";
  const ageLine =
    diff === 0
      ? "Based on the visible markers in this photo, your skin is reading aligned with your chronological age."
      : `Based on the visible markers in this photo, your skin is reading about ${diffAbs} year${diffAbs !== 1 ? "s" : ""} ${diff > 0 ? "ahead of" : "behind"} your chronological age.`;

  const metricRow = (label, level, desc) => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
      <tr>
        <td style="background:#FAF6F0;border:1px solid #E8D5C4;border-radius:12px;padding:16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#2C1810;
                text-transform:uppercase;letter-spacing:0.07em;padding-bottom:6px;">
                ${label}
              </td>
              <td align="right">
                <span style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                  color:#772135;background:#FAF6F0;border:1px solid #E8D5C4;
                  border-radius:20px;padding:3px 10px;text-transform:uppercase;
                  letter-spacing:0.06em;">${level || ""}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="font-family:Arial,sans-serif;font-size:13px;
                color:#9B7B7B;line-height:1.6;">${desc || ""}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const outlookRow = (year, label, text) => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="margin-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.12);">
      <tr>
        <td style="padding-bottom:12px;">
          <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
            color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.1em;
            margin-bottom:4px;">${year}${label ? " — " + label : ""}</div>
          <div style="font-family:Arial,sans-serif;font-size:13px;
            color:rgba(255,255,255,0.85);line-height:1.6;">${text || ""}</div>
        </td>
      </tr>
    </table>`;

  const planRow = (num, heading, body) => `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
      <tr>
        <td width="36" valign="top">
          <div style="width:28px;height:28px;border-radius:50%;background:#772135;
            color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;
            text-align:center;line-height:28px;">${num}</div>
        </td>
        <td style="padding-left:12px;font-family:Arial,sans-serif;font-size:13px;
          color:#9B7B7B;line-height:1.6;">
          <strong style="color:#2C1810;display:block;margin-bottom:2px;">${heading}</strong>
          ${body}
        </td>
      </tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Future Face Skin Snapshot</title>
</head>
<body style="margin:0;padding:0;background-color:#FAF6F0;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#FAF6F0;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <!-- Email container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#FFFBF3;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color:#772135;padding:28px 32px;text-align:center;">
              <div style="font-family:Georgia,serif;font-size:28px;font-weight:700;
                color:#ffffff;letter-spacing:0.04em;margin-bottom:6px;">Future Face</div>
              <div style="font-family:Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.7);
                text-transform:uppercase;letter-spacing:0.14em;">Your Skin Snapshot</div>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:32px 32px 0 32px;">

              <!-- Overall Score -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#FAF6F0;border:1px solid #E8D5C4;
                    border-radius:16px;padding:24px;text-align:center;">
                    <div style="font-family:Georgia,serif;font-size:56px;font-weight:700;
                      color:#772135;line-height:1;">${analysis.overallScore}</div>
                    <div style="font-family:Arial,sans-serif;font-size:11px;color:#9B7B7B;
                      text-transform:uppercase;letter-spacing:0.1em;margin-top:4px;">
                      Overall Skin Score / 100
                    </div>
                    <div style="font-family:Arial,sans-serif;font-size:13px;color:#9B7B7B;
                      margin-top:12px;line-height:1.6;">${ageLine}</div>
                    <div style="font-family:Arial,sans-serif;font-size:13px;color:#2C1810;
                      margin-top:6px;">
                      Skin pattern in this photo:
                      <strong>${analysis.skinType}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Skin Age Comparison -->
              <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                color:#772135;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">
                Visible Skin Age Estimate
              </div>
              <div style="font-family:Georgia,serif;font-size:20px;color:#2C1810;margin-bottom:14px;">
                Real age vs estimated skin age
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#FAF6F0;border:1px solid #E8D5C4;
                border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="38%" style="text-align:center;">
                          <div style="font-family:Georgia,serif;font-size:48px;font-weight:700;
                            color:#2C1810;line-height:1;">${userAge}</div>
                          <div style="font-family:Arial,sans-serif;font-size:10px;
                            color:#9B7B7B;text-transform:uppercase;letter-spacing:0.08em;
                            margin-top:6px;">Real Age</div>
                        </td>
                        <td width="24%" style="text-align:center;">
                          <table cellpadding="0" cellspacing="0" border="0"
                            align="center" style="margin:0 auto;">
                            <tr>
                              <td style="width:52px;height:52px;border-radius:50%;
                                border:2px solid ${diffCol};text-align:center;
                                vertical-align:middle;">
                                <div style="font-family:Georgia,serif;font-size:22px;
                                  font-weight:700;color:${diffCol};line-height:1;">
                                  ${diffAbs}
                                </div>
                                <div style="font-family:Arial,sans-serif;font-size:8px;
                                  color:${diffCol};font-weight:700;text-transform:uppercase;">
                                  YRS
                                </div>
                              </td>
                            </tr>
                          </table>
                          <div style="font-family:Arial,sans-serif;font-size:9px;
                            color:${diffCol};font-weight:700;text-transform:uppercase;
                            letter-spacing:0.06em;margin-top:6px;">${diffLabel}</div>
                        </td>
                        <td width="38%" style="text-align:center;">
                          <div style="font-family:Georgia,serif;font-size:48px;font-weight:700;
                            color:${diffCol};line-height:1;">${analysis.skinAge}</div>
                          <div style="font-family:Arial,sans-serif;font-size:10px;
                            color:#9B7B7B;text-transform:uppercase;letter-spacing:0.08em;
                            margin-top:6px;">Estimated Skin Age</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:${diffCol}18;border-top:1px solid ${diffCol}33;
                    padding:10px 20px;text-align:center;border-radius:0 0 12px 12px;">
                    <div style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;
                      color:${diffCol};line-height:1.5;">${ageLine}</div>
                  </td>
                </tr>
              </table>

              <!-- Skin Markers -->
              <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                color:#772135;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">
                Skin Markers
              </div>
              <div style="font-family:Georgia,serif;font-size:20px;color:#2C1810;margin-bottom:14px;">
                What your photo shows
              </div>
              ${metricRow("Visible Blemish Activity", analysis.acne?.riskLevel, analysis.acne?.description)}
              ${metricRow("Visible Line Formation", analysis.wrinkle?.riskLevel, analysis.wrinkle?.description)}
              ${metricRow("Tone Evenness", analysis.pigmentation?.riskLevel, analysis.pigmentation?.description)}
              ${metricRow("Hydration Reserve", analysis.hydration?.level, analysis.hydration?.description)}

              <!-- Long-term Outlook -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-bottom:28px;margin-top:4px;">
                <tr>
                  <td style="background-color:#772135;border-radius:16px;padding:24px;">
                    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                      color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.15em;
                      margin-bottom:6px;">Long-term Skin Outlook</div>
                    <div style="font-family:Georgia,serif;font-size:20px;color:#ffffff;
                      margin-bottom:8px;">Where your skin may be headed</div>
                    <div style="font-family:Arial,sans-serif;font-size:11px;
                      color:rgba(255,255,255,0.55);line-height:1.6;margin-bottom:20px;
                      font-style:italic;">
                      This forward-looking view is directional and based on the visible markers
                      in this photo. It is not a guarantee or medical assessment.
                    </div>

                    ${outlookRow("Now", "", "What your skin is showing today.")}
                    ${outlookRow("1 Year", "With inconsistent support", analysis.futureSimulation?.year1 || "You may begin to notice slightly drier texture, more visible fine lines, and less bounce through the eye and cheek area.")}
                    ${outlookRow("3 Years", "With inconsistent support", analysis.futureSimulation?.year3 || "Visible lines may deepen, tone may look less even, and skin may appear less firm if daily hydration and protection stay inconsistent.")}

                    <!-- 5 Years highlighted -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:rgba(255,255,255,0.1);border:1px solid
                          rgba(255,255,255,0.25);border-radius:12px;padding:16px;">
                          <div style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;
                            color:#C9A96E;text-transform:uppercase;letter-spacing:0.1em;
                            margin-bottom:4px;">&#9733; Most Supported Outcome</div>
                          <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                            color:rgba(255,255,255,0.6);text-transform:uppercase;
                            letter-spacing:0.1em;margin-bottom:6px;">5 Years — With consistent support</div>
                          <div style="font-family:Arial,sans-serif;font-size:13px;
                            color:rgba(255,255,255,0.9);line-height:1.6;">
                            ${analysis.futureSimulation?.withCare || "With steady antioxidant support, barrier care, and daily SPF, skin is more likely to maintain smoother texture, stronger visible resilience, and a more even-looking tone."}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Support Plan -->
              <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                color:#772135;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px;">
                Personalized for You
              </div>
              <div style="font-family:Georgia,serif;font-size:20px;color:#2C1810;margin-bottom:14px;">
                Your Future Face support plan
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#FAF6F0;border:1px solid #E8D5C4;
                border-radius:16px;padding:20px;margin-bottom:20px;">
                <tr><td style="padding:20px;">
                  ${planRow(1, "Protect daily", "Use a broad-spectrum SPF 30+ every morning and reapply during prolonged UV exposure.")}
                  ${planRow(2, "Support from within", "Add daily antioxidant support with 365 SkinFuel to help skin deal with ongoing oxidative stress.")}
                  ${planRow(3, "Hydrate on the surface", "Use a barrier-supportive moisturizer 365 SkinDrench morning and night to help skin hold water more effectively.")}
                  ${planRow(4, "Drink mineral-rich water", "Hydrate daily with mineral water to support skin cell renewal and maintain moisture balance.")}
                </td></tr>
              </table>

              <!-- Products -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#FAF6F0;border:1px solid #E8D5C4;
                border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:16px;">
                    <div style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;
                      color:#772135;letter-spacing:0.12em;text-transform:uppercase;
                      margin-bottom:12px;">Recommended System for This Result</div>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="margin-bottom:10px;">
                      <tr>
                        <td width="10" valign="top">
                          <div style="width:8px;height:8px;border-radius:50%;
                            background-color:#772135;margin-top:4px;"></div>
                        </td>
                        <td style="padding-left:10px;font-family:Arial,sans-serif;
                          font-size:13px;color:#2C1810;line-height:1.5;">
                          <strong>365 SkinFuel</strong>
                          <span style="color:#9B7B7B;"> — Daily internal antioxidant support</span>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="10" valign="top">
                          <div style="width:8px;height:8px;border-radius:50%;
                            background-color:#772135;margin-top:4px;"></div>
                        </td>
                        <td style="padding-left:10px;font-family:Arial,sans-serif;
                          font-size:13px;color:#2C1810;line-height:1.5;">
                          <strong>365 SkinDrench</strong>
                          <span style="color:#9B7B7B;"> — Barrier-first hydration and smoother wear under makeup</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#772135;border-radius:12px;">
                          <a href="https://futureface.ca/shop/"
                            style="display:inline-block;padding:14px 36px;
                            font-family:Arial,sans-serif;font-size:13px;font-weight:700;
                            color:#ffffff;text-decoration:none;letter-spacing:0.08em;
                            text-transform:uppercase;">
                            Build My Future Face Routine &#8594;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── DISCLAIMER ── -->
          <tr>
            <td style="padding:20px 32px 32px;text-align:center;
              font-family:Arial,sans-serif;font-size:11px;color:#9B7B7B;line-height:1.6;">
              This analysis is designed for informational and cosmetic guidance only.
              It is not a diagnosis or a substitute for medical care. For persistent or
              clinical skin concerns, consult a licensed dermatologist.
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#5a1828;padding:16px 32px;text-align:center;">
              <div style="font-family:Georgia,serif;font-size:16px;color:#ffffff;
                margin-bottom:4px;">Future Face</div>
              <div style="font-family:Arial,sans-serif;font-size:11px;
                color:rgba(255,255,255,0.5);">futureface.ca</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}