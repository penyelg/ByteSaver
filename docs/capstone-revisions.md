# ByteSaver capstone revisions

## Proposed title

**ByteSaver: A Web-Based Marketplace for Pre-Owned Computers and Computer Hardware with Identity Verification and Transaction Management**

This retains the project name, identifies its platform and market, and describes the main verification and transaction capabilities. Transaction management covers orders, commissions, payments, refunds, settlement, and tax records. This is a proposed academic title pending adviser approval.

## Revised project description

ByteSaver is a web-based marketplace for pre-owned computers, computer hardware, and peripherals. Buyers and sellers submit a valid identification document for administrator review before they can publish sale listings or make purchases. The platform supports order management, payment processing, transaction-based commissions, and applicable tax calculations and records. Administrators manage identity reviews, marketplace moderation, and transaction oversight.

## Account verification and approval

1. A user registers and completes the required profile information.
2. The user sees the privacy notice and submits an accepted valid ID through private storage.
3. The submission enters `pending_review`. Profile completion does not automatically approve it.
4. An authorized administrator reviews the document and records an approval or rejection with reviewer, timestamp, and reason. Approval indicates the review outcome; it is not a guarantee against fraud.
5. An approved, active account can buy and sell. A rejected user can submit a replacement document for another review. Suspension blocks new listings and purchases and triggers review of outstanding transactions.

Use separate verification states (`not_submitted`, `pending_review`, `approved`, `rejected`) and account-access states (`active`, `suspended`). The user cannot edit their own verification outcome, access state, or administrator role. Keep a history of submissions and decisions rather than overwriting the review trail.

The same account approval covers buying and selling. Listing moderation remains a separate process: an approved seller's new listing can still require administrator approval before publication. Browsing and saved-cart access may remain available to signed-in users awaiting verification; attempts to sell or check out should explain the approval requirement and link to verification.

Enforce eligibility on the server as well as in the interface, including direct listing creation and order creation. Recheck the buyer and seller when the order is created, and define how suspension affects payment and settlement for existing orders. Existing users receive no automatic exemption.

Only the document owner and authorized reviewers can access ID submissions. Use private storage and time-limited access, restrict reviewer permissions, and exclude IDs and document numbers from public responses and logs. Decide accepted documents, review criteria, retention/deletion periods, and a process for review disputes before collecting real IDs. An ID upload alone is not identity verification.

## Orders, commissions, payments, and taxes

The proposed revenue model deducts a platform commission from the seller's proceeds. This allocation is a proposal; the panel's requirement establishes transaction commissions but does not specify who pays or the rate.

At checkout, show the item subtotal, each applicable tax, any buyer-facing charge, and the final amount before payment. Show the seller the commission, any seller deductions, and expected net proceeds. Avoid presenting the entire item subtotal as platform revenue: the commission is the platform's transaction revenue.

Store the agreed item price, currency, commission basis/rate/amount, applicable tax categories/bases/rates/amounts, buyer total, and seller proceeds with the order. Use explicit rounding rules and exact money arithmetic. Keep tax on an item sale separate from tax on the platform's service when the confirmed rules require that distinction. Rates and fee configuration changes apply to future orders, not historical transactions.

Use a payment provider for collection and an explicitly supported seller settlement flow. Keep order, payment, refund, and settlement states separate. Confirm provider events on the server, validate the order/currency/amount, and handle repeated events without duplicate charges or credits. Reserve inventory safely so two buyers cannot purchase the same available unit. Produce a payment receipt and maintain transaction reports.

Define whether commission becomes earned at payment or completed handover and when seller funds are released. Record refunds, commission reversals, tax adjustments, and failed settlements without deleting the original transaction history. Payment-provider fees and platform commission are distinct amounts.

Tax processing in this scope means applying confirmed tax rules, displaying amounts, preserving transaction records, and producing the required reports and documents. Actual tax registration, withholding, remittance, filing, and statutory invoice requirements require a confirmed jurisdiction and operating model. Until these are established, use clearly labeled demonstration rules and test payments for capstone demonstrations. Do not describe a sample calculation as compliant production tax processing.

## Acceptance criteria

| Area | Expected result |
| --- | --- |
| Unverified buyer | Cannot create an order or initiate payment, including through a direct request. |
| Unverified seller | Cannot publish a listing, including through a direct request. |
| ID submission | A private upload creates a pending review; it does not grant transaction access. |
| Administrator review | Only an authorized administrator can decide a submission; actor, time, and reason are recorded. |
| Rejection and resubmission | The applicant sees the reason and can resubmit while prior decisions remain auditable. |
| Approved account | Can buy and sell subject to active account status, listing moderation, and inventory rules. |
| ID privacy | Another marketplace user cannot retrieve the submitted document or its private identifiers. |
| Checkout | Buyer total and seller deductions are disclosed before the transaction is committed. |
| Commission | Applied rate and amount are reproducible from the stored order snapshot. |
| Payment | An authenticated provider confirmation matching the order is required to mark payment successful; duplicate events have no duplicate effect. |
| Inventory | Concurrent purchases cannot both reserve the same available unit. |
| Refund | Payment, commission, tax, and seller proceeds adjustments remain traceable. |
| Taxes | Displayed tax amounts match the confirmed configured rules and saved transaction records. |
| Reports | Administrators can reconcile gross sales, commission revenue, taxes, refunds, and seller settlements. |

## Decisions required before production implementation

- Accepted IDs, review criteria, reviewer access, retention/deletion policy, and handling of existing accounts.
- Commission payer, rate, calculation basis, rounding, and earning/refund policy.
- Payment provider, supported payment methods, seller onboarding, settlement timing, and dispute handling.
- Operating jurisdiction, platform and seller tax responsibilities, applicable rates and tax bases, and required invoices/reports.

## Implementation sequence and status

1. Confirm verification and transaction policies and revise the database design and access rules.
2. Build private ID submission, administrator review, audit history, and server-enforced approval gates for existing and new accounts.
3. Build orders and inventory reservation, then commission and tax snapshots with explicit demonstration or confirmed production rules.
4. Integrate provider test checkout, verified payment events, refunds, seller settlements, and reconciliation reports.
5. Validate both approval gates, private-document access, transaction totals, concurrency, duplicate payment events, and refund accounting before production use.

As of October 19, 2026, private ID-photo submission, administrator review, resubmission history, and approval gates are implemented; see [the implementation notes](identity-verification.md). Orders, commissions, payments, settlement, and tax processing remain requirements and implementation planning. The earlier database design's optional direct-payment model does not satisfy the revised payment-processing requirement. Reconcile that transaction design before implementing its tables or migrations.
