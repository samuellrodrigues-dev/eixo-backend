// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
// Aumentamos o limite para garantir que as fotografias (Base64) das Metas passam sem erro
app.use(express.json({ limit: '50mb' })); 

// ==========================================
// 1. REGISTO
// ==========================================
app.post('/auth/signup', async (req, res) => {
  const { name, email, cpf, phone, password, birthDate } = req.body;
  try {
    const userExists = await prisma.user.findFirst({
      where: { OR: [{ email }, { cpf }] }
    });

    if (userExists) return res.status(400).json({ error: "E-mail ou CPF já registados." });
    
    const user = await prisma.user.create({
      data: {
        name, email, cpf, phone, password,
        birthDate: birthDate ? new Date(birthDate) : null
      }
    });
    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar conta" });
  }
});

// ==========================================
// 2. LOGIN
// ==========================================
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findFirst({ where: { email, password } });
    if (!user) return res.status(401).json({ error: "E-mail ou palavra-passe incorretos." });
    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao efetuar login" });
  }
});

// ==========================================
// 3. DASHBOARD
// ==========================================
app.get('/dashboard/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { transactions: true, goals: true }
    });

    if (!user) return res.status(404).json({ error: "Utilizador não encontrado" });

    const balance = user.transactions.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);
    const monthlyIncome = user.transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const monthlyExpenses = user.transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

    const activeGoals = user.goals.map(g => ({
      id: g.id, title: g.title, target: g.targetValue, current: g.currentValue, imageUrl: g.imageUrl
    }));

    const sortedTransactions = user.transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return res.json({
      name: user.name, currentStreak: user.currentStreak,
      balance, monthlyIncome, monthlyExpenses,
      activeGoals, transactions: sortedTransactions
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao carregar dashboard" });
  }
});

// ==========================================
// 4. NOVA TRANSAÇÃO
// ==========================================
app.post('/transactions', async (req, res) => {
  const { description, amount, type, userId } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: { description, amount: parseFloat(amount), type, userId }
    });
    return res.json(transaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao guardar transação" });
  }
});

// ==========================================
// 5. NOVA META
// ==========================================
app.post('/goals', async (req, res) => {
  const { title, targetValue, imageUrl, userId } = req.body;
  try {
    const goal = await prisma.goal.create({
      data: { title, targetValue: parseFloat(targetValue), imageUrl, userId }
    });
    return res.json(goal);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao guardar meta" });
  }
});

// ==========================================
// LIGAR O SERVIDOR NA PORTA CERTA
// ==========================================
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Eixo rodando na porta ${PORT}`);
});