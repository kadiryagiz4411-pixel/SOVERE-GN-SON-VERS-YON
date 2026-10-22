/**
 * Legacy Auto-Fill entry. Prefer autofill.js.
 * Never auto-submits a proposal.
 */
function injectProposalToDOM(proposalText) {
  if (typeof globalThis.sovereignInjectProposal === 'function') {
    return globalThis.sovereignInjectProposal(proposalText);
  }
  return false;
}
