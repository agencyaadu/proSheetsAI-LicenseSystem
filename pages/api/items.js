// pages/api/items.js

export default function handler(req, res) {
    if (req.method === 'GET') {
      // Example data
      const items = [
        { id: 1, name: 'Item 1', price: 100 },
        { id: 2, name: 'Item 2', price: 200 },
        { id: 3, name: 'Item 3', price: 300 },
      ];
      res.status(200).json(items);
    } else if (req.method === 'POST') {
      const newItem = req.body; // Assuming the client sends JSON data
      res.status(201).json({ message: 'Item created', item: newItem });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  }
  