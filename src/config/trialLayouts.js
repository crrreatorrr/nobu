// Owner-approved extensions change only their own local layout.
export const LAYOUT = Object.freeze({ 1: 2, 2: 2, 3: 2 });
// Advance only after the owner confirms the matching hub variants are deployed.
// Merging the hub PR alone does not establish production readiness.
export const HUB_LAYOUT = Object.freeze({ 1: 2, 2: 2, 3: 2 });
