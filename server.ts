import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Client } from "@notionhq/client";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Notion Client
const getNotionClient = () => {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN não configurado nos Secrets");
  return new Client({ auth: token });
};

const PROMPTS_DB_ID = process.env.NOTION_PROMPTS_DB_ID || "";
const BACKUPS_DB_ID = process.env.NOTION_BACKUPS_DB_ID || "";

app.use(express.json());

// Helper to get text from Notion rich_text property
const getRichText = (property: any) => {
  return property?.rich_text?.map((t: any) => t.plain_text).join("") || "";
};

// Helper to split long text into Notion rich_text chunks (2000 chars limit each)
const splitRichText = (text: string) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += 2000) {
    chunks.push({
      text: { content: text.substring(i, i + 2000) }
    });
  }
  return chunks;
};

// API Routes
app.get("/api/prompt", async (req, res) => {
  const { category } = req.query;
  const categoryStr = (category as string) || "#INFORMAÇÕES ADICIONAIS";

  try {
    if (!PROMPTS_DB_ID) throw new Error("NOTION_PROMPTS_DB_ID não configurado nos Secrets");
    
    const notion = getNotionClient();
    const response = await notion.databases.query({
      database_id: PROMPTS_DB_ID,
      filter: {
        property: "Name",
        title: {
          equals: categoryStr
        }
      },
      page_size: 1,
    });

    if (response.results.length === 0) {
      return res.json({
        name: categoryStr,
        versao: 1.0,
        data: new Date().toLocaleDateString("pt-BR"),
        promptAtualizado: `Nenhum prompt encontrado para "${categoryStr}". Verifique se o nome no Notion está exatamente igual!`,
        promptDiaAnterior: "",
        logAlteracoes: "",
      });
    }

    const page = response.results[0] as any;
    const props = page.properties;

    res.json({
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text || categoryStr,
      versao: props.Versão?.number || 1.0,
      data: props.Data?.date?.start || new Date().toLocaleDateString("pt-BR"),
      promptAtualizado: getRichText(props["Prompt Atualizado"]),
      promptDiaAnterior: getRichText(props["Prompt Dia Anterior"]),
      logAlteracoes: getRichText(props["Log de Alterações"]),
    });
  } catch (error: any) {
    console.error("Erro Notion Prompt:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/backups", async (req, res) => {
  const { category } = req.query;
  const categoryStr = (category as string) || "#INFORMAÇÕES ADICIONAIS";

  try {
    if (!BACKUPS_DB_ID) throw new Error("NOTION_BACKUPS_DB_ID não configurado nos Secrets");

    const notion = getNotionClient();
    const response = await notion.databases.query({
      database_id: BACKUPS_DB_ID,
      filter: {
        property: "Backup",
        title: {
          contains: categoryStr
        }
      },
      sorts: [{ property: "Data", direction: "descending" }],
      page_size: 20,
    });

    const backups = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        backup: props.Backup?.title?.[0]?.plain_text || "Backup",
        versao: props.Versão?.number || 0,
        data: props.Data?.date?.start || page.created_time,
        prompt: getRichText(props["Prompt"]),
        log: getRichText(props["Log de Alterações"]),
      };
    });

    res.json(backups);
  } catch (error: any) {
    console.error("Erro Notion Backups:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/update", async (req, res) => {
  const { novoPrompt, logDeAlteracoes, category } = req.body;
  const categoryStr = category || "#INFORMAÇÕES ADICIONAIS";

  if (!novoPrompt) return res.status(400).json({ success: false, error: "Prompt vazio" });

  try {
    const notion = getNotionClient();
    // 1. Buscar estado atual
    const currentRes = await notion.databases.query({
      database_id: PROMPTS_DB_ID,
      filter: {
        property: "Name",
        title: {
          equals: categoryStr
        }
      },
      page_size: 1,
    });

    if (currentRes.results.length === 0) throw new Error(`Registro "${categoryStr}" não encontrado no Notion`);

    const currentPage = currentRes.results[0] as any;
    const currentProps = currentPage.properties;
    
    const nomeAtual = currentProps.Name?.title?.[0]?.plain_text || categoryStr;
    const versaoAtual = currentProps.Versão?.number || 1.0;
    const promptAntigo = getRichText(currentProps["Prompt Atualizado"]);
    const dataHoje = new Date().toISOString().split('T')[0];

    // 2. Criar Backup
    // O usuário pediu: "na tabela de Histórico de Backups na coluna 'Prompt' deve aparecer o novo prompt"
    const cleanCategory = categoryStr.replace(/^#+/, "").trim();
    const backupTitle = `#${cleanCategory.toUpperCase()} @${dataHoje} v${(versaoAtual + 0.1).toFixed(1)} - BACKUP`;

    await notion.pages.create({
      parent: { database_id: BACKUPS_DB_ID },
      properties: {
        Backup: { title: [{ text: { content: backupTitle } }] },
        Versão: { number: Math.round((versaoAtual + 0.1) * 10) / 10 },
        "Data": { date: { start: new Date().toISOString() } },
        "Prompt": { rich_text: splitRichText(novoPrompt) }, 
        "Log de Alterações": { rich_text: splitRichText(logDeAlteracoes || "Sem log") },
      },
    });

    // 3. Atualizar Principal
    // O usuário pediu: "ao invés de aparecer em 'Prompt atualizado' deve aparecer em 'Prompt Dia Anterior'"
    // "pois 'Prompt atualizado' é uma coluna só pra enviar as atualizações"
    const novaVersao = Math.round((versaoAtual + 0.1) * 10) / 10;
    await notion.pages.update({
      page_id: currentPage.id,
      properties: {
        Versão: { number: novaVersao },
        Data: { date: { start: dataHoje } },
        "Prompt Atualizado": { rich_text: [] }, // Limpar pois é apenas para "enviar"
        "Prompt Dia Anterior": { rich_text: splitRichText(novoPrompt) },
        "Log de Alterações": { rich_text: [] }, // Limpar log
      },
    });

    res.json({ success: true, novaVersao });
  } catch (error: any) {
    console.error("Erro Notion Update:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/all-backups", async (req, res) => {
  try {
    if (!BACKUPS_DB_ID) throw new Error("NOTION_BACKUPS_DB_ID não configurado nos Secrets");

    const notion = getNotionClient();
    const response = await notion.databases.query({
      database_id: BACKUPS_DB_ID,
      sorts: [{ property: "Data", direction: "descending" }],
      page_size: 100, // Fetch more for global history
    });

    const backups = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        backup: props.Backup?.title?.[0]?.plain_text || "Backup",
        versao: props.Versão?.number || 0,
        data: props.Data?.date?.start || page.created_time,
        prompt: getRichText(props["Prompt"]),
        log: getRichText(props["Log de Alterações"]),
      };
    });

    res.json(backups);
  } catch (error: any) {
    console.error("Erro Notion All Backups:", error);
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/backups/:id", async (req, res) => {
  const { id } = req.params;
  const { category } = req.query;
  const categoryStr = (category as string) || "#INFORMAÇÕES ADICIONAIS";

  try {
    const notion = getNotionClient();

    // 1. Deletar o backup atual
    await notion.pages.update({
      page_id: id,
      archived: true,
    });

    // 2. Buscar o NOVO backup mais recente para esta categoria
    const backupsRes = await notion.databases.query({
      database_id: BACKUPS_DB_ID,
      filter: {
        property: "Backup",
        title: {
          contains: categoryStr
        }
      },
      sorts: [{ property: "Data", direction: "descending" }],
      page_size: 1,
    });

    if (backupsRes.results.length > 0) {
      const latestBackup = backupsRes.results[0] as any;
      const latestProps = latestBackup.properties;
      const latestPrompt = getRichText(latestProps["Prompt"]);
      const latestVersao = latestProps.Versão?.number || 1.0;

      // 3. Atualizar o Prompt Principal com a versão anterior (agora a mais recente)
      const currentRes = await notion.databases.query({
        database_id: PROMPTS_DB_ID,
        filter: {
          property: "Name",
          title: {
            equals: categoryStr
          }
        },
        page_size: 1,
      });

      if (currentRes.results.length > 0) {
        const currentPage = currentRes.results[0] as any;
        await notion.pages.update({
          page_id: currentPage.id,
          properties: {
            Versão: { number: latestVersao },
            "Prompt Dia Anterior": { rich_text: splitRichText(latestPrompt) },
            "Prompt Atualizado": { rich_text: [] },
            "Log de Alterações": { rich_text: [] },
          },
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Erro Notion Delete Backup:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/all-prompts", async (req, res) => {
  try {
    if (!PROMPTS_DB_ID) throw new Error("NOTION_PROMPTS_DB_ID não configurado nos Secrets");
    
    const notion = getNotionClient();
    const response = await notion.databases.query({
      database_id: PROMPTS_DB_ID,
      sorts: [{ property: "Name", direction: "ascending" }],
    });

    const prompts = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text || "Sem nome",
        versao: props.Versão?.number || 1.0,
        data: props.Data?.date?.start || page.last_edited_time,
        promptAtualizado: getRichText(props["Prompt Atualizado"]),
        promptDiaAnterior: getRichText(props["Prompt Dia Anterior"]),
        logAlteracoes: getRichText(props["Log de Alterações"]),
        statusDiario: props["Status Diário"]?.select?.name || "Pendente",
        ultimaEdicao: page.last_edited_time,
      };
    });

    res.json(prompts);
  } catch (error: any) {
    console.error("Erro Notion All Prompts:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
