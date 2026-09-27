"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import { ArrowUpRight, Check, Clock3, ExternalLink, LoaderCircle, RefreshCw, Wallet2 } from "lucide-react";

const ADDRESS = "0x66772109f272c69498168503A5868b6Ecf8fEd08" as const;
const POLICY_ID = "clocktower-v1";
const EXPLORER = "https://explorer-studio.genlayer.com";
const PENDING_KEY = "story-guardian-pending-v1";
const HISTORY_KEY = "story-guardian-history-v1";
const EXAMPLES = ["sg-muj7qsed-eabc677d", "sg-muj7nfoi-644056c6", "sg-muj7x9ev-852c8d5e", "try-001", "try-002", "try-003"];
const EXAMPLE_TX: Record<string, string> = {
  "sg-muj7qsed-eabc677d": "0x273f34edfbdef9ccea0948bd12a55ef9fd0b6598c8652bb5798a553902903565",
  "sg-muj7nfoi-644056c6": "0x341b94f13d8ac3a9ae5bafba9ebf54938ab302c618486c32eae67e915de61ca5",
  "sg-muj7x9ev-852c8d5e": "0x70ab3430f94ad58dd7f3b1426375923c26771ef2787a76e80e4e37da1d31edd6",
  "try-001": "0x5a7a7e40cfc53f1f8ab0a9c10e93b710ffdea538442b0639c878e04a888c041b",
  "try-002": "0x8292f9dcbf59376b256bbbfabdd6b4323c36846ab919ce953c860ec9afb636a0",
  "try-003": "0xe20ff68fccfa5c07bf8d74bbed7ae0db05ef35664e6716718eea48b580d3476e",
};
type Language = "zh" | "en";
type Policy = { policy_id: string; title: string; scenario: string; allow_rule: string; deny_rule: string };
type Verdict = "APPROVED" | "REJECTED" | "NEEDS_MORE_INFO";
type Decision = { policy_id: string; submission_id: string; proposal: string; verdict: Verdict; forbidden: string; permitted: string; reason: string };
type Pending = { id: string; hash: `0x${string}`; proposal: string; submittedAt: number };
type Activity = { id: string; hash?: string };
type Provider = { request: (request: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
declare global { interface Window { ethereum?: Provider } }

const words = {
  zh: {
    title: "钟楼里的信", subtitle: "午夜之前，把信送到父亲手中。你想出的办法，由链上规则判定。",
    chapter: "第一章 / THE CLOCKTOWER LETTER", before: "午夜之前", storyTitle: "一封信，\n一座不能开的门。", story: "父亲在钟楼外等待一封信。原件必须留在塔内，门必须保持关闭。你能怎样把信送到他手里？",
    must: "你必须做到", allow: "一份完整、逐字相同且仍写给父亲的信件副本，必须在午夜前送到父亲手里。",
    cannot: "你不能做", deny: "信的原件不能离开钟楼；午夜前，钟楼门必须保持关闭。",
    ruleNote: "两条规则都要满足。关键事实没有说清楚时，判定可能是“信息不足”。",
    form: "写下你的办法", help: "用自己的话描述具体步骤。链上规则为英文，建议用英文描述方案。",
    placeholder: "例如：I make a complete verbatim copy of the letter addressed to the father. I keep the original inside, leave the door shut, and pass the copy out through a window before midnight.",
    input: "你的方案", count: "10–1200 个字符", submit: "提交给链上守门人", connectSubmit: "连接钱包并提交", wallet: "连接钱包", working: "正在处理…",
    loading: "正在读取链上关卡…", unavailable: "暂时无法读取链上规则，已暂停提交。", live: "规则已从链上读取", source: "查看合约", retry: "重试",
    connecting: "连接钱包并切换到 Studionet…", signing: "请在钱包中查看并确认交易…", waiting: "交易已提交，正在等待最终确认。请不要重复提交。", reading: "正在读取链上判定…",
    pending: "等待链上判定", check: "查询结果", tx: "查看交易", result: "守门人的判定", approved: "通过", rejected: "未通过", uncertain: "信息不足",
    reason: "判定理由（链上原文）", yourPlan: "你提交的方案", again: "再试一个办法", records: "已经发生的尝试", recordsHelp: "前三条来自玩家网页提交，后三条来自 Studio 演示；结果均直接从合约读取，无需钱包。", refresh: "刷新记录", failRead: "读取失败", missing: "暂无链上结果",
    raw: "查看链上规则原文", own: "我的提交记录", repo: "项目源代码", finalized: "判定来自合约最终状态",
    notice: "此演示运行在 GenLayer Studionet 测试网。交易可能需要测试网代币，无需购买真实资产；确认前请查看钱包显示的费用。",
    invalid: "请填写 10–1200 个字符的具体方案。", noWallet: "未检测到浏览器钱包。请用安装了 MetaMask 等 EVM 钱包的浏览器打开。", walletFail: "钱包连接或提交失败，请检查钱包与网络。", walletRejected: "你取消了钱包请求；如需提交，请重试并在钱包中确认。", walletBusy: "钱包中已有待处理的请求，请先打开钱包完成或关闭它。", networkFail: "钱包未切换到 GenLayer Studionet（链 ID 61999）。请检查钱包网络后重试。",
    writeFail: "交易最终确认了，但合约执行未成功；请查看交易详情。", pendingFail: "暂时无法确认最终结果。交易编号已保存，请稍后查询；不要重复提交。", empty: "交易已确认，但暂时读不到判定。请稍后查询。",
  },
  en: {
    title: "The Clocktower Letter", subtitle: "Get the letter to the father before midnight. The rules on chain judge your own solution.",
    chapter: "CHAPTER ONE / THE CLOCKTOWER LETTER", before: "Before midnight", storyTitle: "One letter.\nOne door that cannot open.", story: "The father waits outside the clocktower. The original must stay inside, and the door must stay shut. How will you get the letter to him?",
    must: "You must", allow: "Deliver a complete verbatim copy of the letter, still addressed to the father, before midnight.",
    cannot: "You cannot", deny: "The original cannot leave the tower, and the door must remain shut before midnight.",
    ruleNote: "Both conditions apply. If a crucial detail is missing, the verdict may be “needs more info.”",
    form: "Describe your solution", help: "Write concrete steps in your own words. The contract compares your proposal against the public rules.",
    placeholder: "For example: I make a complete verbatim copy of the letter addressed to the father. I keep the original inside, leave the door shut, and pass the copy out through a window before midnight.",
    input: "Your proposal", count: "10–1200 characters", submit: "Submit to the onchain guardian", connectSubmit: "Connect wallet and submit", wallet: "Connect wallet", working: "Working…",
    loading: "Reading the onchain chapter…", unavailable: "Could not read the onchain rules. Submissions are paused.", live: "Rules read from chain", source: "View contract", retry: "Retry",
    connecting: "Connecting wallet and switching to Studionet…", signing: "Review and confirm in your wallet…", waiting: "Transaction submitted. Waiting for finalization. Do not resubmit.", reading: "Reading the onchain decision…",
    pending: "Waiting for an onchain decision", check: "Check result", tx: "View transaction", result: "The guardian's decision", approved: "Approved", rejected: "Rejected", uncertain: "Needs more info",
    reason: "Reason (onchain original)", yourPlan: "Your proposal", again: "Try another idea", records: "Previous attempts", recordsHelp: "The first three came from player website submissions; the last three from Studio. All verdicts are read from the contract without a wallet.", refresh: "Refresh records", failRead: "Read failed", missing: "No onchain result yet",
    raw: "Read original rules", own: "My submissions", repo: "Project source", finalized: "Decision from finalized contract state",
    notice: "This demo runs on GenLayer Studionet. Transactions may need testnet tokens; no real asset purchase is needed. Review your wallet's fee before confirming.",
    invalid: "Describe a concrete solution in 10–1200 characters.", noWallet: "No browser wallet found. Open this page in a browser with an EVM wallet such as MetaMask.", walletFail: "Wallet connection or submission failed. Check your wallet and network.", walletRejected: "You canceled the wallet request. Try again and approve it in your wallet.", walletBusy: "A wallet request is already pending. Open your wallet and complete or dismiss it first.", networkFail: "The wallet did not switch to GenLayer Studionet (chain ID 61999). Check its network and try again.",
    writeFail: "The transaction finalized, but the contract did not succeed. Check its details.", pendingFail: "The final result is not available yet. Your transaction ID is saved; check later and do not resubmit.", empty: "Transaction is final, but its decision is not readable yet. Check later.",
  },
};

const readClient = createClient({ chain: studionet });
function decode<T>(value: unknown): T | null {
  if (typeof value === "string" && value.trim()) return JSON.parse(value) as T;
  if (value && typeof value === "object" && !Array.isArray(value)) return value as T;
  return null;
}
async function getPolicy() {
  return decode<Policy>(await readClient.readContract({ address: ADDRESS, functionName: "get_policy", args: [POLICY_ID], transactionHashVariant: TransactionHashVariant.LATEST_FINAL }));
}
async function getDecision(id: string) {
  return decode<Decision>(await readClient.readContract({ address: ADDRESS, functionName: "get_result", args: [id], transactionHashVariant: TransactionHashVariant.LATEST_FINAL }));
}
async function getDecisionAfterFinal(id: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const decision = await getDecision(id);
      if (decision) return decision;
    } catch (cause) {
      if (attempt === 2) throw cause;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1800));
  }
  return null;
}
function receiptFailure(receipt: unknown): string | null {
  if (!receipt || typeof receipt !== "object") return null;
  const fields = receipt as {
    statusName?: string; status_name?: string; txExecutionResultName?: string;
    consensus_data?: { leader_receipt?: Array<{ execution_result?: string }> };
  };
  const status = fields.status_name ?? fields.statusName;
  const execution = fields.txExecutionResultName ?? fields.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (execution === ExecutionResult.FINISHED_WITH_ERROR || execution === "ERROR" || execution === "FAILED" || status === TransactionStatus.CANCELED) {
    return [status, execution].filter(Boolean).join(" / ");
  }
  return null;
}
function errorCode(cause: unknown, depth = 0): number | undefined {
  if (!cause || typeof cause !== "object" || depth > 4) return undefined;
  const details = cause as Record<string, unknown>;
  const code = typeof details.code === "number" || typeof details.code === "string" ? Number(details.code) : NaN;
  if (Number.isFinite(code)) return code;
  return errorCode(details.cause ?? details.data ?? details.originalError, depth + 1);
}
function errorMessage(cause: unknown, depth = 0): string | undefined {
  if (typeof cause === "string") return cause;
  if (!cause || typeof cause !== "object" || depth > 4) return undefined;
  const details = cause as Record<string, unknown>;
  for (const key of ["shortMessage", "message", "details", "reason"] as const) {
    if (typeof details[key] === "string" && details[key].trim()) return details[key];
  }
  return errorMessage(details.cause ?? details.data ?? details.originalError, depth + 1);
}
function errorText(cause: unknown, t: typeof words.zh) {
  const code = errorCode(cause);
  if (code === 4001) return t.walletRejected;
  if (code === -32002) return t.walletBusy;
  const message = errorMessage(cause);
  if (message && message !== "[object Object]") return message.slice(0, 400);
  return code === undefined ? t.walletFail : `${t.walletFail} (code ${code})`;
}
async function switchToStudionet(provider: Provider, networkFail: string) {
  const chainId = `0x${studionet.id.toString(16)}`;
  const current = await provider.request({ method: "eth_chainId" });
  if (typeof current === "string" && current.toLowerCase() === chainId) return;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (cause) {
    if (errorCode(cause) !== 4902) throw cause;
    await provider.request({ method: "wallet_addEthereumChain", params: [{
      chainId, chainName: studionet.name, rpcUrls: studionet.rpcUrls.default.http,
      nativeCurrency: studionet.nativeCurrency,
      ...(studionet.blockExplorers?.default?.url ? { blockExplorerUrls: [studionet.blockExplorers.default.url] } : {}),
    }] });
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  }
  const selected = await provider.request({ method: "eth_chainId" });
  if (typeof selected !== "string" || selected.toLowerCase() !== chainId) throw new Error(networkFail);
}
function storedPending(): Pending | null {
  try {
    const item = JSON.parse(localStorage.getItem(PENDING_KEY) || "null") as Pending | null;
    return item && /^0x[a-f\d]{64}$/i.test(item.hash) && /^[a-z\d-]{3,64}$/i.test(item.id) ? item : null;
  } catch { return null; }
}
function storeActivity(item: Activity) {
  try {
    const previous = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Activity[];
    localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...previous.filter((entry) => entry.id !== item.id)].slice(0, 8)));
  } catch { /* Browser storage is optional. */ }
}

export default function Guardian() {
  const [lang, setLang] = useState<Language>("zh");
  const t = words[lang];
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyState, setPolicyState] = useState<"loading" | "ready" | "error">("loading");
  const [proposal, setProposal] = useState("");
  const [wallet, setWallet] = useState("");
  const [stage, setStage] = useState<"idle" | "connecting" | "signing" | "waiting" | "reading" | "resume">("idle");
  const [pending, setPending] = useState<Pending | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState("");
  const [examples, setExamples] = useState<Record<string, Decision | null | "error">>({});
  const [examplesLoading, setExamplesLoading] = useState(true);
  const [history, setHistory] = useState<Activity[]>([]);

  const refreshPolicy = useCallback(async () => {
    setPolicyState("loading");
    try {
      const found = await getPolicy();
      if (!found || found.policy_id !== POLICY_ID) throw new Error("Policy unavailable");
      setPolicy(found);
      setPolicyState("ready");
    } catch { setPolicyState("error"); }
  }, []);
  const refreshExamples = useCallback(async () => {
    setExamplesLoading(true);
    const entries = await Promise.all(EXAMPLES.map(async (id) => {
      try { return [id, await getDecision(id)] as const; }
      catch { return [id, "error"] as const; }
    }));
    setExamples(Object.fromEntries(entries));
    setExamplesLoading(false);
  }, []);
  useEffect(() => {
    void refreshPolicy();
    void refreshExamples();
    const previousPending = storedPending();
    setPending(previousPending);
    try {
      const previousHistory = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Activity[];
      setHistory(previousHistory);
      const latest = previousHistory[0];
      if (!previousPending && latest?.id?.startsWith("sg-") && latest.hash) {
        void getDecision(latest.id).then((found) => {
          if (found) { setDecision((current) => current ?? found); setProposal((current) => current || found.proposal); }
        }).catch(() => { /* The record can still be opened manually. */ });
      }
    } catch { /* optional */ }
    const provider = window.ethereum;
    if (!provider) return;
    provider.request({ method: "eth_accounts" }).then((accounts) => {
      if (Array.isArray(accounts) && typeof accounts[0] === "string") setWallet(accounts[0]);
    }).catch(() => {});
    const changed = (...args: unknown[]) => {
      const accounts = args[0];
      setWallet(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "");
    };
    provider.on?.("accountsChanged", changed);
    return () => provider.removeListener?.("accountsChanged", changed);
  }, [refreshPolicy, refreshExamples]);

  useEffect(() => {
    type SiteTool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => Promise<unknown> };
    const context = (document as Document & { modelContext?: { registerTool: (tool: SiteTool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const stageTool: SiteTool = {
      name: "stage_story_proposal",
      title: "Prepare a story solution",
      description: "Fill the visible story proposal field. The player must then connect their wallet and confirm the onchain transaction themselves.",
      inputSchema: { type: "object", properties: { proposal: { type: "string", minLength: 10, maxLength: 1200, description: "A concrete solution to the clocktower puzzle" } }, required: ["proposal"], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected an object with a proposal.");
        const data = input as Record<string, unknown>;
        if (Object.keys(data).some((key) => key !== "proposal") || typeof data.proposal !== "string") throw new Error("Proposal must be a string.");
        const clean = data.proposal.trim();
        if (clean.length < 10 || clean.length > 1200) throw new Error("Proposal must be 10–1200 characters.");
        if (storedPending()) throw new Error("A transaction is still pending; check it first.");
        setProposal(clean); setDecision(null); setError("");
        document.getElementById("proposal")?.focus();
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        return { status: "ready_for_wallet_confirmation", proposalLength: clean.length };
      },
    };
    void Promise.resolve(context.registerTool(stageTool, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, []);

  async function connectWallet() {
    if (!window.ethereum) throw new Error(t.noWallet);
    const provider = window.ethereum;
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string") throw new Error(t.walletFail);
    const address = accounts[0] as `0x${string}`;
    await switchToStudionet(provider, t.networkFail);
    setWallet(address);
    return address;
  }

  async function finishTransaction(item: Pending, receipt: unknown) {
    setStage("reading");
    const result = await getDecisionAfterFinal(item.id);
    if (result) {
      setDecision(result);
      setProposal(result.proposal);
      setPending(null);
      localStorage.removeItem(PENDING_KEY);
      return;
    }
    const failure = receiptFailure(receipt);
    if (failure) {
      setError(`${t.writeFail} ${failure}`);
      setPending(null);
      localStorage.removeItem(PENDING_KEY);
      return;
    }
    setError(t.empty);
  }

  async function checkPending(item: Pending) {
    setError(""); setStage("resume");
    try {
      let result = await getDecision(item.id);
      if (!result) {
        const receipt = await readClient.waitForTransactionReceipt({ hash: item.hash as never, status: TransactionStatus.FINALIZED, retries: 60 });
        await finishTransaction(item, receipt);
        return;
      }
      setDecision(result);
      setProposal(result.proposal);
      setPending(null);
      localStorage.removeItem(PENDING_KEY);
    } catch (cause) {
      setError(errorText(cause, t) === t.empty ? t.empty : t.pendingFail);
    } finally { setStage("idle"); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = proposal.trim();
    if (clean.length < 10 || clean.length > 1200) { setError(t.invalid); return; }
    if (!policy || pending || stage !== "idle") return;
    if (!window.ethereum) { setError(t.noWallet); return; }
    setError(""); setDecision(null);
    let hash: `0x${string}` | undefined;
    try {
      setStage("connecting");
      const address = await connectWallet();
      const client = createClient({ chain: studionet, account: address, provider: window.ethereum as never });
      const id = "sg-" + Date.now().toString(36) + "-" + crypto.randomUUID().slice(0, 8);
      const write = { address: ADDRESS, functionName: "adjudicate", args: [POLICY_ID, id, clean], value: BigInt(0) };
      setStage("signing");
      hash = await client.writeContract(write) as `0x${string}`;
      const item: Pending = { id, hash: hash!, proposal: clean, submittedAt: Date.now() };
      setPending(item);
      try { localStorage.setItem(PENDING_KEY, JSON.stringify(item)); } catch { /* ID remains visible in this tab. */ }
      storeActivity({ id, hash });
      setHistory((old) => [{ id, hash }, ...old.filter((entry) => entry.id !== id)].slice(0, 8));
      setStage("waiting");
      const receipt = await client.waitForTransactionReceipt({ hash: hash as never, status: TransactionStatus.FINALIZED, retries: 60 });
      await finishTransaction(item, receipt);
    } catch (cause) {
      setError(hash ? t.pendingFail : errorText(cause, t));
    } finally { setStage("idle"); }
  }

  const currentStep = stage === "connecting" ? t.connecting : stage === "signing" ? t.signing : stage === "waiting" ? t.waiting : stage === "reading" ? t.reading : stage === "resume" ? t.pending : "";
  const verdict = (value: Verdict) => value === "APPROVED" ? t.approved : value === "REJECTED" ? t.rejected : t.uncertain;

  return <div className="site-shell">
    <header className="site-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true">RG<span>✦</span></span><span>STORY GUARDIAN</span></div>
      <div className="header-actions"><span className="network"><span className="network-dot"/>Studionet · Testnet</span><button type="button" className="lang-button" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>{lang === "zh" ? "EN" : "中文"}</button><button type="button" className="wallet-button" disabled={stage !== "idle"} onClick={() => { setStage("connecting"); setError(""); void connectWallet().catch((cause) => setError(errorText(cause, t))).finally(() => setStage("idle")); }}><Wallet2 size={17}/>{wallet ? wallet.slice(0, 6) + "…" + wallet.slice(-4) : t.wallet}</button></div>
    </header>
    <main className="main-layout">
      <div className="intro"><div className="eyebrow"><span className="line"/>GENLAYER · INTERACTIVE STORY</div><h1>{t.title}<span className="title-period">.</span></h1><p>{t.subtitle}</p></div>
      <div className="game-grid">
        <section className="chapter" aria-labelledby="chapter-heading">
          <div className="chapter-top"><span>{t.chapter}</span><span className="chapter-time"><Clock3 size={15}/>{t.before}</span></div>
          <div className="chapter-body"><span className="chapter-index" aria-hidden="true">01</span><h2 id="chapter-heading">{t.storyTitle}</h2><p>{t.story}</p></div>
          <div className="rule-cards"><div className="rule-card allow"><span className="rule-symbol" aria-hidden="true">✓</span><div><h3>{t.must}</h3><p>{t.allow}</p></div></div><div className="rule-card deny"><span className="rule-symbol" aria-hidden="true">×</span><div><h3>{t.cannot}</h3><p>{t.deny}</p></div></div></div>
          <p className="rule-note">{t.ruleNote}</p>
          <div className="chapter-footer"><span>{policyState === "ready" ? <><span className="live-dot"/>{t.live}</> : policyState === "loading" ? t.loading : t.unavailable}</span>{policyState === "error" ? <button type="button" onClick={() => void refreshPolicy()}><RefreshCw size={15}/>{t.retry}</button> : <a href={EXPLORER + "/address/" + ADDRESS} target="_blank" rel="noopener noreferrer">{t.source}<ArrowUpRight size={15}/></a>}</div>
        </section>
        <section className="play-panel" aria-labelledby="form-heading">
          <div className="panel-heading"><div><span className="step-label">YOUR MOVE / 02</span><h2 id="form-heading">{t.form}</h2></div><span className="small-asterisk" aria-hidden="true">✦</span></div>
          <p className="form-help">{t.help}</p>
          <form onSubmit={(event) => void submit(event)}><label htmlFor="proposal" className="field-label">{t.input}</label><textarea id="proposal" value={proposal} onChange={(event) => setProposal(event.target.value)} minLength={10} maxLength={1200} placeholder={t.placeholder} disabled={!!pending || stage !== "idle"} required/><div className="field-meta"><span>{t.count}</span><span>{proposal.length} / 1200</span></div><button className="submit-button" type="submit" disabled={policyState !== "ready" || !!pending || stage !== "idle" || proposal.trim().length < 10}>{stage !== "idle" ? <><LoaderCircle className="spinner" size={18}/>{t.working}</> : <>{wallet ? t.submit : t.connectSubmit}<ArrowUpRight size={19}/></>}</button></form>
          {currentStep && <div className="process" role="status"><LoaderCircle className="spinner" size={17}/><span>{currentStep}</span></div>}
          {error && <div className="error" role="alert">{error}</div>}
          {pending && <div className="pending-box"><strong>{t.pending}</strong><code>{pending.id}</code><div className="pending-actions"><a href={EXPLORER + "/tx/" + pending.hash} target="_blank" rel="noopener noreferrer">{t.tx}<ExternalLink size={14}/></a><button type="button" onClick={() => void checkPending(pending)} disabled={stage !== "idle"}><RefreshCw size={15}/>{t.check}</button></div></div>}
          {decision && !pending && <div className={"decision " + decision.verdict.toLowerCase()} role="status"><div className="decision-top"><span>{t.result}</span><strong>{decision.verdict === "APPROVED" && <Check size={20}/>} {verdict(decision.verdict)}</strong></div><p className="decision-reason-label">{t.reason}</p><p className="decision-reason">{decision.reason}</p><details><summary>{t.yourPlan}</summary><p>{decision.proposal}</p></details><div className="decision-bottom"><code>{decision.submission_id}</code><button type="button" onClick={() => { setDecision(null); setProposal(""); setError(""); }}>{t.again}</button></div></div>}
          <div className="panel-footnote"><span className="tiny-diamond">◇</span>{t.notice}</div>
        </section>
      </div>
      <section className="records" aria-labelledby="records-heading"><div className="records-heading"><div><span className="step-label">ONCHAIN ARCHIVE / 03</span><h2 id="records-heading">{t.records}</h2><p>{t.recordsHelp}</p></div><button type="button" disabled={examplesLoading} onClick={() => void refreshExamples()}><RefreshCw size={16} className={examplesLoading ? "spinner" : ""}/>{t.refresh}</button></div>
        <div className="record-grid">{EXAMPLES.map((id, index) => { const result = examples[id]; return <article className="record" key={id}><div className="record-top"><span>0{index + 1} / {id}</span><span className={result && result !== "error" ? "record-tag " + result.verdict.toLowerCase() : "record-tag"}>{examplesLoading && !result ? "…" : result === "error" ? t.failRead : result ? verdict(result.verdict) : t.missing}</span></div><p>{result && result !== "error" ? result.proposal : examplesLoading ? "…" : t.missing}</p>{result && result !== "error" && <div className="record-reason">{result.reason}</div>}{result && result !== "error" && <a className="record-tx" href={EXPLORER + "/tx/" + EXAMPLE_TX[id]} target="_blank" rel="noopener noreferrer">{t.tx}<ExternalLink size={13}/></a>}</article>; })}</div>
        {history.length > 0 && <details className="my-history"><summary>{t.own} ({history.length})</summary><ul>{history.map((item) => <li key={item.id}><button type="button" onClick={() => { void getDecision(item.id).then((result) => { if (result) { setDecision(result); setProposal(result.proposal); window.scrollTo({ top: 0, behavior: "smooth" }); } else setError(t.missing); }).catch(() => setError(t.failRead)); }}>{item.id}</button>{item.hash && <a href={EXPLORER + "/tx/" + item.hash} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/></a>}</li>)}</ul></details>}
      </section>
      {policy && <details className="raw-policy"><summary>{t.raw}</summary><div><div><strong>Scenario</strong><p>{policy.scenario}</p></div><div><strong>Allowed condition</strong><p>{policy.allow_rule}</p></div><div><strong>Forbidden condition</strong><p>{policy.deny_rule}</p></div></div></details>}
    </main>
    <footer className="site-footer"><span>STORY GUARDIAN · RULEGATE</span><span>{t.finalized}</span><a href="https://github.com/halihalibt/story-guardian-clocktower" target="_blank" rel="noopener noreferrer">{t.repo}<ArrowUpRight size={15}/></a></footer>
  </div>;
}
