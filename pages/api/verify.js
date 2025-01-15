import exp from 'constants';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const secretKey = process.env.LICENSE_SECRET_KEY;

export default function handler(req, res) {

    if (req.method === 'POST') {

        const { email , license} = req.body;

        if (!email || !license) {
            return res.status(400).json({ message: 'Email and License is required' });
        }

        // Recreate the expected License data
        const expectedLicenseData = {
            email
        };

        const expectedLicenseString = JSON.stringify(expectedLicenseData);

        // Verify the license using HMAC-SHA256 with the secret key
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(expectedLicenseString);
        const expectedSignature = hmac.digest('hex');

        if (license === expectedSignature) {
            return res.status(200).json({ message: 'License is valid' , status: true });
        } else {
            return res.status(400).json({ message: 'License is invalid' , status: false });
        }

    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method Not Allowed' });

    }

}