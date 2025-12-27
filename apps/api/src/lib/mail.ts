import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_EMAIL = "onboarding@resend.dev"; // Replace with verifying domain in production

// Premium Design System (Inline Styles)
const styles = {
  main: `
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f8fafc;
    padding: 40px 20px;
    color: #475569;
  `,
  container: `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    border: 1px solid #e2e8f0;
  `,
  header: `
    padding: 32px 40px;
    text-align: center;
    border-bottom: 1px solid #f1f5f9;
    background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
  `,
  logo: `
    font-size: 28px;
    font-weight: 800;
    color: #4f46e5; /* Indigo-600 */
    text-decoration: none;
    letter-spacing: -0.5px;
  `,
  body: `
    padding: 40px 40px;
    line-height: 1.6;
    color: #334155; /* Slate-700 */
  `,
  h1: `
    font-size: 24px;
    font-weight: 700;
    color: #0f172a; /* Slate-900 */
    margin-bottom: 24px;
    text-align: center;
    letter-spacing: -0.5px;
  `,
  text: `
    font-size: 16px;
    margin-bottom: 24px;
    text-align: center;
  `,
  highlight: `
    color: #4f46e5;
    font-weight: 600;
  `,
  amountBox: `
    background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
    border: 1px solid #e0e7ff;
    border-radius: 16px;
    padding: 24px;
    text-align: center;
    margin: 32px 0;
  `,
  amountLabel: `
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #6366f1;
    font-weight: 600;
    margin-bottom: 8px;
  `,
  amountValue: `
    font-size: 36px;
    font-weight: 800;
    color: #1e1b4b; /* Indigo-950 */
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    letter-spacing: -1px;
  `,
  buttonContainer: `
    text-align: center;
    margin-top: 32px;
  `,
  button: `
    display: inline-block;
    padding: 14px 32px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    text-decoration: none;
    border-radius: 50px; /* Pill shape */
    font-weight: 600;
    font-size: 16px;
    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1);
    transition: transform 0.2s;
  `,
  footer: `
    padding: 32px;
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    background-color: #f8fafc;
    border-top: 1px solid #f1f5f9;
  `,
  footerLink: `
    color: #64748b;
    text-decoration: underline;
  `,
};

export const MailService = {
  async sendPaymentReminder({
    toEmail,
    toName,
    fromName,
    amount,
    groupName,
    currency = "INR",
  }: {
    toEmail: string;
    toName: string;
    fromName: string;
    amount: number;
    groupName: string;
    currency?: string;
  }) {
    const formattedAmount = `${currency === "INR" ? "₹" : currency} ${(
      amount / 100
    ).toFixed(2)}`;
    const subject = `You owe ${fromName} ${formattedAmount}`; // Short, punchy subject

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="${styles.main}">
        <div style="${styles.container}">
          
          <div style="${styles.header}">
            <a href="http://localhost:5173" style="${styles.logo}">Settlr.</a>
          </div>

          <div style="${styles.body}">
            <h1 style="${styles.h1}">Payment Reminder</h1>
            
            <p style="${styles.text}">
              Hi ${toName}, just a friendly nudge from <strong>${fromName}</strong> regarding the expense in <span style="${
      styles.highlight
    }">${groupName}</span>.
            </p>

            <div style="${styles.amountBox}">
              <div style="${styles.amountLabel}">Amount Due</div>
              <div style="${styles.amountValue}">${formattedAmount}</div>
            </div>

            <div style="${styles.buttonContainer}">
              <a href="http://localhost:5173" style="${
                styles.button
              }">Settle Up Now</a>
            </div>
          </div>

          <div style="${styles.footer}">
            <p>&copy; ${new Date().getFullYear()} Settlr. Tracking expenses made simple.</p>
            <p>
              <a href="#" style="${styles.footerLink}">Unsubscribe</a> • 
              <a href="#" style="${styles.footerLink}">Help Center</a>
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    try {
      const response = await resend.emails.send({
        from: `Settlr <${SENDER_EMAIL}>`,
        to: toEmail,
        subject: subject,
        html: html,
      });

      if (response.error) {
        console.error("Failed to send payment reminder:", response.error);
        return { success: false, error: response.error };
      }

      console.log("Payment reminder sent:", response.data);
      return { success: true, id: response.data?.id };
    } catch (error) {
      console.error("Failed to send payment reminder:", error);
      return { success: false, error };
    }
  },

  async sendGroupInvite({
    toEmail,
    groupName,
    inviterName,
    inviteCode,
  }: {
    toEmail: string;
    groupName: string;
    inviterName: string;
    inviteCode?: string;
  }) {
    const subject = `${inviterName} invited you to "${groupName}"`;
    const inviteLink = inviteCode
      ? `http://localhost:5173/invite/${inviteCode}`
      : "http://localhost:5173";

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="${styles.main}">
        <div style="${styles.container}">
          
          <div style="${styles.header}">
            <a href="http://localhost:5173" style="${styles.logo}">Settlr.</a>
          </div>

          <div style="${styles.body}">
            <h1 style="${styles.h1}">You're Invited!</h1>
            
            <p style="${styles.text}">
              <span style="${
                styles.highlight
              }">${inviterName}</span> has invited you to join the group <strong>${groupName}</strong> on Settlr.
            </p>

            <p style="${styles.text}">
              Join the group to start tracking expenses and settling debts seamlessly.
            </p>

            <div style="${styles.buttonContainer}">
              <a href="${inviteLink}" style="${styles.button}">Accept Invite</a>
            </div>
          </div>

          <div style="${styles.footer}">
            <p>&copy; ${new Date().getFullYear()} Settlr.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    try {
      const response = await resend.emails.send({
        from: `Settlr <${SENDER_EMAIL}>`,
        to: toEmail,
        subject: subject,
        html: html,
      });

      if (response.error) {
        console.error("Failed to send group invite:", response.error);
        return { success: false, error: response.error };
      }

      console.log("Group invite sent:", response.data);
      return { success: true, id: response.data?.id };
    } catch (error) {
      console.error("Failed to send group invite:", error);
      return { success: false, error };
    }
  },
};
