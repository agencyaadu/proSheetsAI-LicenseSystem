import { error, timeStamp } from 'console';
import crypto from 'crypto';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { parse } from 'path';

dotenv.config();

const secretKey = process.env.LICENSE_SECRET_KEY;
const SMTPUser = process.env.SMTP_USER || "jv@aadu.agency";
const SMTPPass = process.env.SMTP_PASS || "uhxf jxfx jpqe fino";
const SMTPHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTPPort = process.env.SMTP_PORT || 587;

export default async function handler(req, res) {

    if (req.method === 'POST') {
        
        const authorizationSignature = req.headers["x-signature"];
        const authorizationTimestamp = req.headers["x-timestamp"];

        if (!authorizationSignature || !authorizationTimestamp) {
            return res.status(400).json({error: "Missing Authorization signature"})
        }

        const now = Date.now();
        if (now - parseInt(authorizationTimestamp) > 30000) {
            return res.status(401).json({error: "Unauthorized Request"})
        }

        const authorizationPayload = `${authorizationTimestamp}`
        const expectedAuthorizationSignature = crypto.createHmac("sha256", secretKey).update(authorizationPayload).digest("hex");

        if (authorizationSignature === expectedAuthorizationSignature) {

            const { email } = req.body;
    
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }
    
            const licenseData = {
                email,
            };
    
            const licenseString = JSON.stringify(licenseData);
    
            const hmac = crypto.createHmac('sha256', secretKey);
    
            hmac.update(licenseString);
    
            const signature = hmac.digest('hex');
    
            const transporter = nodemailer.createTransport({
                host: SMTPHost,
                port: SMTPPort,
                secure: SMTPPort === 465,
                auth: {
                    user: SMTPUser,
                    pass: SMTPPass
                }
            })
    
            const mailOptions = {
                from: "jv@aadu.agency",
                to: email,
                subject: "proSheetsAI - License Key",
                html: `
                    <p>Hi there,</p>
                    <p>Thank you for purchasing <strong>proSheetsAI</strong>! We’re excited to have you on board and can’t wait for you to experience the full power of proSheetsAI.</p>
                    <p><strong>Here’s your license key:</strong></p>
                    <pre style="background: #f4f4f4; padding: 10px; border-radius: 5px;">${signature}</pre>
                    <p>To activate your license, enter the above key in the proSheetsAI application.</p>
                    <p>If you have any questions or run into any issues, don’t hesitate to contact our support team at <a href="mailto:support@proSheetsAI.com">support@proSheetsAI.com</a>.</p>
                    <p>Thanks again for choosing proSheetsAI!</p>
                    <p>Best regards,</p>
                    <p><strong>agencyAadu</strong></p>
                `, // HTML body
            };
    
            try {
    
                await transporter.sendMail(mailOptions);
    
                return res.status(200).json({
                    message: "License Generated and Sent Successfully",
                    license: signature,
                    data: licenseData,
                });
                
            } catch (error) {
                console.error("Error sending Email:", error);
                return res.status(500).json({message: 'Failed to send email', error: error.message})
            }

        } else {
            return res.status(401).json({error: "Unauthorized Signature"})
        }


    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });

    }

}