// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ... o resto das rotas de auth, transactions e goals continua igual!

// ==========================================
// 1. ROTA DE REGISTO (SIGNUP)
// ==========================================
app.post('/auth/signup', async (req, res) => {
  const { name, email, cpf, phone, password, birthDate } = req.body;
  
  try {
    // Verifica se já existe alguém com este E-mail ou CPF
    const userExists = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { cpf }]
      }
    });

    if (userExists) {
      return res.status(400).json({ error: "E-mail ou CPF já registados." });
    }

    // Cria o novo utilizador
    const user = await prisma.user.create({
      data: {
        name,
        email,
        cpf,
        phone,
        password, // Nota: Numa aplicação real, a password seria encriptada aqui
        birthDate: birthDate ? new Date(birthDate) : null
      }
    });
    
    console.log("🔵 Novo utilizador registado:", user.name);
    return res.json(user);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar conta" });
  }
});

// ==========================================
// 2. ROTA DE LOGIN (SIGNIN)
// ==========================================
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Procura o utilizador com o e-mail e palavra-passe exatos
    const user = await prisma.user.findFirst({
      where: { email, password }
    });

    if (!user) {
      return res.status(401).json({ error: "E-mail ou palavra-passe incorretos." });
    }

    console.log("🟢 Login com sucesso:", user.name);
    return res.json(user);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao efetuar login" });
  }
});

// ==========================================
// 2. NOVA ROTA: CRIAR TRANSAÇÃO (Dinheiro)
// ==========================================
app.post('/transactions', async (req, res) => {
  const { description, amount, type, userId } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: { 
        description, 
        amount: parseFloat(amount), 
        type, // "INCOME" ou "EXPENSE"
        userId 
      }
    });
    return res.json(transaction);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao salvar transação" });
  }
});

// ==========================================
// 3. NOVA ROTA: CRIAR META (Agora com Imagem)
// ==========================================
app.post('/goals', async (req, res) => {
  const { title, targetValue, imageUrl, userId } = req.body;
  try {
    const goal = await prisma.goal.create({
      data: { 
        title, 
        targetValue: parseFloat(targetValue), 
        imageUrl,
        userId 
      }
    });
    return res.json(goal);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao guardar meta" });
  }
}); // <-- MUITA ATENÇÃO AQUI: Garanta que esta linha com }); existe!

// A nuvem vai injetar a porta dela aqui, ou usar a 3333 se estiver no seu Mac
const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Servidor Eixo rodando na porta ${PORT}`);
});

// ==========================================
// 4. DASHBOARD ATUALIZADO (Matemática Real)
// ==========================================
app.get('/dashboard/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Busca o usuário e já "puxa" junto todas as transações e metas dele
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        transactions: true,
        goals: true
      }
    });

    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    // Lógica de cálculo financeiro
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    user.transactions.forEach(t => {
      if (t.type === 'INCOME') monthlyIncome += t.amount;
      if (t.type === 'EXPENSE') monthlyExpenses += t.amount;
    });

    const balance = monthlyIncome - monthlyExpenses;

    // Formata as metas para a aplicação ler
    const activeGoals = user.goals.map(g => ({
      id: g.id,
      title: g.title,
      target: g.targetValue,
      current: g.currentValue
      imageUrl: g.imageUrl
    }));

    // NOVA LÓGICA: Organiza as transações da mais recente para a mais antiga
    const sortedTransactions = user.transactions.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    return res.json({
      name: user.name,
      currentStreak: user.currentStreak,
      balance,
      monthlyIncome,
      monthlyExpenses,
      activeGoals,
      transactions: sortedTransactions // <-- Enviamos o extrato aqui!
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao buscar dados do dashboard" });
  }
});

// A nuvem vai injetar a porta dela aqui, ou usar a 3333 se estiver no seu Mac
const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🚀 Servidor Eixo rodando na porta ${PORT}`);
});