import { handle } from '@astrojs/cloudflare/handler';

import { cleanupOrphanedReservations } from './lib/server/commerce';
import type { RuntimeEnvironment } from './lib/server/runtime-env';

export default {
  fetch(request, environment, context) {
    return handle(request, environment, context);
  },

  scheduled(_controller, environment, context) {
    context.waitUntil(
      cleanupOrphanedReservations(environment).catch(() => {
        console.error('Scheduled reservation cleanup failed.');
      }),
    );
  },
} satisfies ExportedHandler<RuntimeEnvironment>;
