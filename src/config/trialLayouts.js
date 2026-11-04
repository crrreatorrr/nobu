// Each extension changes only its own entry; L1 layout2 is owner-approved.
export const LAYOUT = Object.freeze({ 1: 2, 2: 1, 3: 1 });
// Advance only after the owner confirms the matching hub variants are deployed.
// Merging the hub PR alone does not establish production readiness.
export const HUB_LAYOUT = Object.freeze({ 1: 1, 2: 1, 3: 1 });
