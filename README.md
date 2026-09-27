# RuleGate：剧情守门人

我做了一个基于 GenLayer 的互动剧情游戏。玩家可以自由写出自己的通关方案，网页通过钱包提交到智能合约，再读取链上判定结果和理由。第一个关卡叫 **The Clocktower Letter（钟楼里的信）**。

**[打开可玩的网页](https://story-guardian-clocktower.zsf197176.chatgpt.site)** · [查看链上合约](https://explorer-studio.genlayer.com/address/0x66772109f272c69498168503A5868b6Ecf8fEd08) · [Project guide and verification cases](docs/PROJECTS_SUBMISSION.md)

这个仓库包含可玩的网页、钱包交互代码、合约源码和复现说明。网页使用先前已部署的 RuleGate 合约；本次网页项目增加了玩家界面、链上读取与提交、交易结果展示及网页端实测记录。合约地址和部署交易沿用现有部署。

## 从网页体验

1. 无需钱包即可打开网页，查看从链上读取的规则与六条历史判定；前三条来自真实玩家网页提交。
2. 在文本框写下 10–1200 字符的具体方案。合约规则为英文，建议先用英文描述。
3. 通过浏览器 EVM 钱包连接 GenLayer Studionet（chain ID 61999），按提示授权账户和切换网络，再在钱包里检查并确认测试网交易。
4. 等待最终确认。网页通过 `get_result` 读取链上保存的结论和理由；若等待超时，刷新页面后可继续查询原交易，不要重复提交。

这是测试网演示，不涉及购买真实资产。钱包交易可能需要测试网代币；确认交易前请检查钱包显示的费用。钱包密钥只由你自己的钱包管理，网页不托管密钥。

## 为什么做这个

剧情游戏通常需要预设选项，但玩家的想法不一定在选项里。我想试试让玩家直接用自己的话描述办法，再由链上合约依据公开规则判断结果。

**要解决的信任问题：**如果开放式方案只由游戏运营方的服务器判分，运营方可以事后改规则或悄悄改玩家的结果。这里先把同一关卡规则固定在链上，再让不同玩家用同一规则提交方案；合约保存原方案、判定信号和理由，其他人无需连接钱包也能独立读取。自然语言判定仍有主观性；遇到关键事实缺失时，合约可以返回 `NEEDS_MORE_INFO`，不把猜测当作通过。

这里用到了 GenLayer 的智能合约能力：模型理解自然语言方案；验证者根据同一规则独立判断；合约对判定信号应用固定逻辑，保存最终结果。判定不仅依赖关键词匹配。

## 演示关卡

父亲在钟楼外，必须在午夜前收到信的完整逐字副本；信的原件不能离开钟楼，钟楼门也必须在午夜前保持关闭。玩家要想办法同时满足这两个条件。

已发布的规则编号为 `clocktower-v1`：

| 字段 | 链上规则 |
| --- | --- |
| 场景 | A letter must reach the father outside the clocktower before midnight. |
| 放行条件 | A complete verbatim copy of the letter, still addressed to the father, must reach him before midnight. |
| 禁止条件 | The original letter cannot leave the tower, and the tower door must remain shut before midnight. |

## 合约如何判定

- `create_policy` 发布一组规则。规则发布后不可修改；新版本使用新的 `policy_id`。
- `adjudicate` 接收玩家方案，分别判断是否违反禁止条件，以及是否满足放行条件。验证者会独立评估这两项判断。
- 两项判断确定后，合约给出 `APPROVED`（通过）、`REJECTED`（未通过）或 `NEEDS_MORE_INFO`（信息不足），并保存原方案、判断信号和理由。
- `get_policy` 和 `get_result` 可读取规则及判定记录。

这套规则结构也能用于新的关卡：发布另一组规则，继续使用同一个判定合约。

## Studionet 实测

我使用钱包 [`0x22Acaa233b7b985b36ef168F2DE9295334065B15`](https://explorer-studio.genlayer.com/address/0x22Acaa233b7b985b36ef168F2DE9295334065B15)，在 GenLayer Studio 的 **Normal (Full Consensus)** 模式部署了 [RuleGate 合约 `0x66772109f272c69498168503A5868b6Ecf8fEd08`](https://explorer-studio.genlayer.com/address/0x66772109f272c69498168503A5868b6Ecf8fEd08)，发布了钟楼规则，并提交了三个不同的方案。以下五笔交易在 Studio 浏览器均显示 `FINALIZED`。

| 操作 | 结果 | 交易 |
| --- | --- | --- |
| 部署合约 | 部署完成 | [查看](https://explorer-studio.genlayer.com/tx/0x5e08d78175b77e1a9d25d0d9400c1ee5fd560a5e4a01e5eb5eb87a41b53ad53e) |
| 发布 `clocktower-v1` | 规则已写入，可用 `get_policy` 读取 | [查看](https://explorer-studio.genlayer.com/tx/0xfdff090c76340ac39cb7fa9893e4c56e475f9b534edb98df358f2dcf616abdf9) |
| `try-001`：原件留在塔里、门保持关闭，从窗口递出完整逐字副本 | `APPROVED` | [查看](https://explorer-studio.genlayer.com/tx/0x5a7a7e40cfc53f1f8ab0a9c10e93b710ffdea538442b0639c878e04a888c041b) |
| `try-002`：打开门，把原件带给父亲 | `REJECTED` | [查看](https://explorer-studio.genlayer.com/tx/0x8292f9dcbf59376b256bbbfabdd6b4323c36846ab919ce953c860ec9afb636a0) |
| `try-003`：原件留在塔里、门保持关闭，拍照发给父亲 | `REJECTED`；照片不满足完整逐字副本条件 | [查看](https://explorer-studio.genlayer.com/tx/0xe20ff68fccfa5c07bf8d74bbed7ae0db05ef35664e6716718eea48b580d3476e) |

三个结果均通过 Studio 的 `get_result` 读回。浏览器交易页中的共识结果 `Accepted` 表示交易被接受；玩家是否过关以 `get_result` 中的 `verdict` 为准。

### 网页钱包提交实测

玩家通过公开网页连接钱包提交了五个新方案。以下结果已经用 Studionet 上同一个合约的 `get_result` 和 `LATEST_FINAL` 读回；前 3 条还会在网页公开记录区实时读取，访客无需钱包即可核对。

| 提交 ID | 链上判定 | 关键区别 | 交易 |
| --- | --- | --- | --- |
| `sg-muj7qsed-eabc677d` | `APPROVED` | 父亲从窗户进出，逐字抄写副本，原件留下，门始终关闭，午夜前取得副本。 | [FINALIZED](https://explorer-studio.genlayer.com/tx/0x273f34edfbdef9ccea0948bd12a55ef9fd0b6598c8652bb5798a553902903565) |
| `sg-muj7nfoi-644056c6` | `NEEDS_MORE_INFO` | 说明了副本与时间，但没有交代原件是否留在塔内、门是否一直关闭。 | [FINALIZED](https://explorer-studio.genlayer.com/tx/0x341b94f13d8ac3a9ae5bafba9ebf54938ab302c618486c32eae67e915de61ca5) |
| `sg-muj7x9ev-852c8d5e` | `REJECTED` | 把交付推到第二天的午夜前，错过规则要求的当晚午夜。 | [FINALIZED](https://explorer-studio.genlayer.com/tx/0x70ab3430f94ad58dd7f3b1426375923c26771ef2787a76e80e4e37da1d31edd6) |
| `sg-muj7fo48-4dfa2001` | `NEEDS_MORE_INFO` | 提到复印和窗口，但没有把关键约束说完整。 | [FINALIZED](https://explorer-studio.genlayer.com/tx/0x9b013984cb55ac4bd1d67cc6f96db7e9d7e625bfc72032dd454b7ecdf7ad6fb0) |
| `sg-muj70jsp-79e2debe` | `APPROVED` | 原件留塔内、门关闭，午夜前从窗口递出完整逐字副本。 | [FINALIZED](https://explorer-studio.genlayer.com/tx/0x4093e5cdc83ee5558ae571df33252ede7aea9207b97065a3c559ee53ec859559) |

这五个 ID 是玩家网页产生的独立记录，不等同于上方在 Studio 中提交的 `try-001` 至 `try-003`。网页在钱包确认后等待交易最终确定，再读取并展示合约保存的结论；刷新后可从本机的“我的提交记录”找回该次尝试。

## 项目结构与运行

- `RuleGate.py`：GenLayer 智能合约。
- `test_rule_gate.py`：本地逻辑测试，运行 `python3 -m unittest -v test_rule_gate.py`。
- `frontend/`：React + TypeScript 玩家网页。使用 GenLayerJS 读取链上规则和结果、通过浏览器钱包提交 `adjudicate`，支持中英切换、交易状态和刷新后续查。
- 在 [GenLayer Studio](https://studio.genlayer.com/) 导入 `RuleGate.py` 即可部署；随后调用 `create_policy` 创建规则，调用 `adjudicate` 提交方案，使用 `get_result` 查看结果。

本地启动网页需要 Node.js 20.19 或更高版本：

```bash
cd frontend
npm install
npm run dev
```

`npm run build` 可检查类型并生成静态网页文件。公开演示使用与 `frontend/src/Guardian.tsx` 相同的交互代码。

**验证范围：**已读取 `clocktower-v1`、三条 Studio 记录和五条玩家网页记录的最终链上状态；玩家已实际从网页连接钱包、提交方案并看到结果。网页构建已通过。Studionet 是测试环境，网络数据的长期保留不作保证；上述记录是玩法演示，不构成现实争议处理服务。
