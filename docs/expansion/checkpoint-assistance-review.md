# Checkpoint assistance repair

Source: gameplay-expansion-plan4.3, rewards-spec11.1–11.3, box-gauntlets-spec2.6, new-levels-spec1.3, H04b handoff.

The authored Pity Snacks had no runtime caller of arm(), and Session.respawn always gave only one pity mask after three deaths. The canonical checkpoint ladder now grants one mask at3+, enables an authored pity spot at7+, and grants two masks at9+. Its5+ hazard multiplier remains available as pure policy; existing per-hazard clocks are unchanged by this repair. Boss-stage assistance remains owned by the existing boss DDA.

`src/game/dda.js` supplies the previously specified but absent `ddaFor` and a runtime `armCheckpointPity` helper. Session calls the helper after every entity and checkpoint balance has restored. PitySnacks.onRespawn remains a no-op, honoring its public persistence contract. An armed spot stays armed for the attempt, remains noncountable/non-solid, and reuses the existing Snacks checkpoint behavior with no Ticket payout or new entity.

Selection uses the actual checkpoint's projected distance, not the death position. It chooses the nearest unbroken main-path pity spot strictly after the checkpoint and before the next authored ordinary main-path Snacks. A closer optional detour spot is excluded; the next ordinary checkpoint still bounds the interval if already broken. An armed nearest spot remains the selection, so repeated deaths cannot cascade to every later spot. After its checkpoint is hit, the death counter resets; only seven new deaths can activate the next eligible spot.

Checkpoint assistance is excluded in trials, remixes, medal/boss-medal runs, rushes, explicit ranked/board/competitive runs. A ranked ownership profile only changes gear permissions; it does not disable help in an ordinary run. Direct manual arm() calls use the same exclusions. Boss-phase respawns do not receive checkpoint masks or arm level pity spots. God mode retains the ordinary ladder policy as specified, though normal god-mode deaths cannot occur.

The generic chase-placement restriction is not used to discard existing authored spots: the owning extension recipes can explicitly place one in a shorter chase. No placement, movement, boss tuning, Ticket cap, vendor file or media is changed.

Tests use real Session respawn/checkpoint, real Stage/Track/Snacks/Pity and TicketSystem. They cover deaths1..6→7→9, stale death positions, visible drop-in/interaction, nearest selection and ordinary-checkpoint bounds, repeated deaths and authoring order, actual pity hit/checkpoint reset, rollback persistence, zero Ticket/raw/Snack changes, all competitive aliases, ordinary ranked-profile play versus a trial on the same profile, and boss-phase separation. Browser/manual verification is unrun; this lifecycle repair needs no GPU.
