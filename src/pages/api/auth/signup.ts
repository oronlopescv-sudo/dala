import type { NextApiRequest, NextApiResponse } from 'next';

type ResponseData = {
  message?: string;
  error?: string;
  user?: { id: string; email: string; username: string };
  token?: string;
};

const users: { [key: string]: any } = {};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Campos obrigatórios' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password muito curto' });
  }

  // Verificar duplicatas
  for (const user of Object.values(users)) {
    if (user.email === email || user.username === username) {
      return res.status(409).json({ error: 'Email ou username já existem' });
    }
  }

  const userId = `user_${Date.now()}`;
  users[userId] = { id: userId, email, username, createdAt: new Date() };

  res.status(201).json({
    message: 'Conta criada com sucesso!',
    user: { id: userId, email, username },
    token: `token_${userId}`,
  });
}
