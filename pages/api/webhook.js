import crypto from 'crypto';
import Stripe from "stripe";
import bodyParser from "body-parser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
    api: {
        bodyParser: false, // Disallow body parsing, consume as stream; Raw data
    },
};

// Middleware to parse raw body
const rawBodyMiddleware = bodyParser.raw({type: "application/json"});

const webhookHandler = async (req, res) => {

    // Validate the Request Method is POST
    if (req.method !== 'POST') {
        return res.status(405).send({ message: 'Method Not Allowed' });
    }

    // Endpoint Secret
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Declaring the Event
    let event;

    try {
        const signature = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    } catch (err) {
        console.error(`⚠️  Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle th event based on type
    switch (event.type) {

        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
            // console.log(event)

            // Need to define a method to send the ordered data to the appscript
            break;
        case 'payment_method.attached':
            const paymentMethod = event.data.object;
            // Need to define a method to send the attached payment method to the appscript
            break;
        
        case 'checkout.session.completed':
            const checkOutSession = event.data.object;
            // console.log(checkOutSession);
            const lineItems = await stripe.checkout.sessions.listLineItems(
                checkOutSession.id
            );
            
            const purchasedItems = lineItems.data[0]

            // const purchasedItems = lineItems.data.map((item) => ({
            //     id: item.id,
            //     name: item.description,
            //     quantity: item.quantity,
            //     price: item.amount_total / 100,
            //     currency: item.currency,
            // }));

            if (purchasedItems.price.product === process.env.PRODUCT_ID) {

                var Order = {
                    productId: purchasedItems.price.product,
                    productName: purchasedItems.description,
                    quantity: purchasedItems.quantity,
                    totalPrice: purchasedItems.amount_total / 100,
                    currency: purchasedItems.currency,
                    customerName: checkOutSession.customer_details.name,
                    email: checkOutSession.customer_details.email,
                    phone: checkOutSession.customer_details.phone,
                    line1: checkOutSession.customer_details.address.line1,
                    line2: checkOutSession.customer_details.address.line2,
                    city: checkOutSession.customer_details.address.city,
                    state: checkOutSession.customer_details.address.state,
                    country: checkOutSession.customer_details.address.country,
                    postalCode: checkOutSession.customer_details.address.postal_code,
                    paymentIntent: checkOutSession.payment_intent,
                }
                
                const baseURL = process.env.BASE_URL || "http://localhost:3000" 

                // Authorization Setup for /api/license endpoint
                const secretKey = process.env.LICENSE_SECRET_KEY;
                const timestamp = Date.now();
                const payload = `${timestamp}`
                const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
                
                const licenseResponse = await fetch(`${baseURL}/api/license`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-signature": signature,
                        "x-timestamp": timestamp,
                    },
                    body: JSON.stringify({email: Order.email}),
                });
                
                if (licenseResponse.ok) {
                    Order.licensekey = "Sent"
                } else {
                    Order.licensekey = "Not Sent"
                }
                console.log("Purchased Items: ", Order);
                
                try {
                    // Send the order data to the appscript
                    const appscriptUrl = process.env.APPSCRIPT_URL;
    
                    const response = await fetch(appscriptUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(Order),
                    });
    
                    const responseData = await response.text();
                    console.log("Response Data: ", responseData);
                } catch (error) {
                    console.error("Failed to send data to AppScript: ", error);
                }
            }
            
            break;
        default:
            console.log(`Unhandled event type ${event.type}.`);

    }

    // Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });

}

export default (req, res) => rawBodyMiddleware(req, res, () => webhookHandler(req, res));
