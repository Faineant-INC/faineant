/**
 * Pre-launch gate. When false (default), the public site is marketing +
 * email capture only: practitioner browsing nav and self-serve sign-ups
 * are hidden. Flip NEXT_PUBLIC_LAUNCH_MODE="true" at launch.
 *
 * Read at call time (not module load) so it reflects the current env in
 * tests and across renders.
 */
export const isLaunched = (): boolean =>
  process.env.NEXT_PUBLIC_LAUNCH_MODE === "true";
