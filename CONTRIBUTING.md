# Contributing

Use Node.js 24 or later, then run npm ci, npm test, npm run lint and npm run build.
Keep the Canvas renderer and the approved illustrated style. Place new scene data
in src/world/campusData.ts and artwork registration in src/assets/rooms/manifest.ts.

Preserve existing character identities and keep exactly ten unique coworkers in
the active campus unless a change explicitly updates that design. Test navigation
against the scene's furniture footprints. Keep gesture/activity clocks outside
React state, honor reduced motion, and avoid continuous decorative motion.

Describe visual checks separately from builds and unit tests. Include the source
and redistribution permission for any contributed artwork. Never commit credentials,
reference screenshots, private logs, recordings, dependencies or generated build files.
