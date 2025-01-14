import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const secretKey = process.env.LICENSE_SECRET_KEY;

export default function handler(req, res) {

    if (req.method === 'POST') {
        
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

        return res.status(200).json({
            license: signature,
            data: licenseData,
        });

    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });

    }

}