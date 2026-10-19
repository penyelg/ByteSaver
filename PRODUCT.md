# ByteSaver

**Proposed capstone title:** ByteSaver: A Web-Based Marketplace for Pre-Owned Computers and Computer Hardware with Identity Verification and Transaction Management

ByteSaver is a student-capstone marketplace for buying and selling pre-owned computers, computer hardware, and peripherals. A single normal account can act as both buyer and seller. Both activities require submission of a valid ID and administrator approval of the account's identity verification. Admins review identity submissions and moderate accounts, listings, and reports. Account approval and listing approval are separate checks.

## Revised requirements

- **Administrator approval:** Accounts awaiting review, rejected accounts, and suspended accounts cannot publish listings or place purchases. Only approved, active accounts may transact, and both parties must remain eligible when an order is created. Existing accounts must also complete verification; profile completion alone does not qualify an account for approval.
- **Valid ID verification:** Buyers and sellers submit a valid ID through a private submission flow. Administrators review it, approve or reject the submission with a reason, and keep an audit history. Rejected applicants can resubmit. ID images are accessible only to authorized reviewers and the submitting account through controlled access; they must never appear on public profiles or listings. Define accepted IDs, retention/deletion rules, and the privacy notice before collecting real documents.
- **Commission revenue:** The platform charges a disclosed commission on transactions. The proposed default is to deduct the commission from seller proceeds. The rate, calculation basis, and point at which commission is earned must be confirmed. Store the applied rate and monetary amounts with each order so later configuration changes do not alter historical totals. Handle commission adjustments for cancellations and refunds.
- **Payment processing:** Checkout uses a payment provider, with server-confirmed payment results, receipts, payment reconciliation, refunds, and seller settlement tracking. A browser redirect or user-reported payment is insufficient to mark an order paid. Do not collect or store raw card credentials.
- **Tax processing:** Calculate and disclose applicable taxes using confirmed rules, record the tax basis/rate/amount with each transaction, and support receipts and tax reports. Tax collection, remittance, withholding, and filing responsibilities must be established before implementation; calculation/reporting alone must not be described as automated tax filing. Do not assume a tax rate or registration status.

See [the capstone revision specification](docs/capstone-revisions.md) for workflows, acceptance criteria, and unresolved policy decisions.

## Implementation status

The current app implements authentication, required personal details and private ID-photo submission, administrator approval/rejection with review history, approval-gated marketplace access and listing creation, browsing/details, and a saved cart. See [identity verification implementation notes](docs/identity-verification.md). Checkout, commissions, payment processing, and tax processing remain target requirements. The earlier transaction design in `docs/database-schema.md` must be reconciled with those requirements before implementation.

The auth surface should feel like a focused hardware marketplace: technical, trustworthy, efficient, and human. It should support mobile screens and make the next action obvious without looking like a generic SaaS template.
