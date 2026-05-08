const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ABA_PROMPTS = "Prompts";
const ABA_BACKUPS = "Backups";

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle("AIVA Prompt Manager")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function inicializarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Aba Prompts
  let sheetPrompts = ss.getSheetByName(ABA_PROMPTS);
  if (!sheetPrompts) {
    sheetPrompts = ss.insertSheet(ABA_PROMPTS);
    sheetPrompts.appendRow([
      "Name", "Versão", "Data", "Prompt Atualizado", 
      "Prompt Dia Anterior", "Log de Alterações", "Próxima Versão", "Status Diário"
    ]);
    sheetPrompts.appendRow([
      "AIVA Principal", 1.0, Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy"), 
      "Você é um assistente de IA...", "", "", "=B2+0.1", "OK"
    ]);
  }

  // Aba Backups
  let sheetBackups = ss.getSheetByName(ABA_BACKUPS);
  if (!sheetBackups) {
    sheetBackups = ss.insertSheet(ABA_BACKUPS);
    sheetBackups.appendRow([
      "Backup", "Versão", "Data do Backup", "PROMPT DA VERSÃO DO BACKUP", "Log de Alterações"
    ]);
  }
}

function getPromptAtual() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_PROMPTS);
  const data = sheet.getRange(2, 1, 1, 6).getValues()[0];
  return {
    name: data[0],
    versao: data[1],
    data: data[2],
    promptAtualizado: data[3],
    promptDiaAnterior: data[4],
    logAlteracoes: data[5]
  };
}

function getBackups() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_BACKUPS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  const backups = data.map(row => ({
    backup: row[0],
    versao: row[1],
    data: row[2],
    prompt: row[3],
    log: row[4]
  }));
  
  return backups.sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 20);
}

function atualizarPrompt(novoPrompt, logDeAlteracoes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetPrompts = ss.getSheetByName(ABA_PROMPTS);
    const sheetBackups = ss.getSheetByName(ABA_BACKUPS);
    
    // PASSO 1
    const currentData = sheetPrompts.getRange(2, 1, 1, 4).getValues()[0];
    const nomeAtual = currentData[0];
    const versaoAtual = currentData[1];
    const promptAntigo = currentData[3];
    const dataHoje = Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy");

    // PASSO 2
    sheetBackups.appendRow([
      `${nomeAtual} @${dataHoje} v${versaoAtual.toFixed(1)} - BACKUP`,
      versaoAtual,
      new Date(),
      promptAntigo,
      logDeAlteracoes
    ]);

    // PASSO 3
    const novaVersao = Math.round((versaoAtual + 0.1) * 10) / 10;
    sheetPrompts.getRange(2, 2).setValue(novaVersao);
    sheetPrompts.getRange(2, 3).setValue(dataHoje);
    sheetPrompts.getRange(2, 4).setValue(novoPrompt);
    sheetPrompts.getRange(2, 5).setValue(promptAntigo);
    sheetPrompts.getRange(2, 6).setValue("");

    return { success: true, novaVersao: novaVersao };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function restaurarPrompt(promptTexto) {
  return promptTexto;
}
