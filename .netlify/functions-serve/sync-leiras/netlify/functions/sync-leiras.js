"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/sync-leiras.ts
var sync_leiras_exports = {};
__export(sync_leiras_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(sync_leiras_exports);
var handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  try {
    const body = JSON.parse(event.body || "{}");
    const leiras = body.leiras || [];
    if (leiras.length > 0) {
      const primeiraLeira = leiras[0];
      return {
        statusCode: 200,
        // Retorna 200 para o App não dar erro de rede
        headers,
        body: JSON.stringify({
          DEBUG: "MODO DE TESTE ATIVADO",
          recebi_leiras: leiras.length,
          chaves_da_primeira_leira: Object.keys(primeiraLeira),
          conteudo_biossolidos_com_acento: primeiraLeira.bioss\u00F3lidos,
          conteudo_biossolidos_sem_acento: primeiraLeira.biossolidos,
          conteudo_mtrs: primeiraLeira.mtrs,
          conteudo_completo_primeira_leira: primeiraLeira
          // Vai mostrar tudo
        })
      };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ message: "Recebi lista vazia" }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ erro: error.message }) };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=sync-leiras.js.map
