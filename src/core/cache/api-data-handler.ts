"use client";

import {
  DataHandler,
  type ResourceRules,
  type WriteEvent,
  type WriteMeta,
} from "orval-data-handler";

import { getErrorMessage as getApiErrorMessage } from "@/core/api-error";
import {
  allApiResourceNames,
  type AllApiResourceName,
} from "@/service-api/generated/api-resource-names";

/**
 * Configurarea bibliotecii `orval-data-handler` pentru API-ul acestui proiect.
 * Toata logica e acolo; aici raman doar deciziile specifice CRM-ului.
 *
 * Numele resurselor vin din spec, prin `api-resource-names.ts` — nu se scriu de
 * mana. Un endpoint nou apare singur dupa `npm run generate-webapi`.
 */

/**
 * Prefixe de ruta care nu tin date de afisat. Scrierile lor nu ating cache-ul.
 *
 * `auth` e aici fiindca dupa logout nu are sens sa re-cerem `/auth/me`: ar da
 * 401 si utilizatorul ar ajunge pe login cu mesajul de "sesiune expirata", in
 * loc de o deconectare normala.
 */
const nonDataResourceNames = ["auth"] as const;

type NonDataResourceName = (typeof nonDataResourceNames)[number];

/** Resursele pe care le sincronizam. Tipul asta e folosit si de `usePermissions`. */
export type ApiResourceName = Exclude<AllApiResourceName, NonDataResourceName>;

/** Ce poate cere un call site prin `mutation.meta`. */
export type ApiMutationMeta = WriteMeta;

const nonDataResources: ReadonlySet<string> = new Set(nonDataResourceNames);

class ApiDataHandler extends DataHandler<ApiResourceName> {
  protected readonly resourceNames = allApiResourceNames.filter(
    (resourceName): resourceName is ApiResourceName =>
      !nonDataResources.has(resourceName),
  );

  /**
   * Doar exceptiile. Implicit, datele raman proaspete un minut si nicio alta
   * resursa nu se re-cere. Adaugi ceva aici cand observi ca o alta pagina ramane
   * cu date vechi dupa o scriere — vezi linia `[data]` din consola.
   */
  protected readonly rules: ResourceRules<ApiResourceName> = {
    // O activitate noua apare in detaliul deal-ului; nu are lista proprie.
    activities: { alsoChanges: ["deals"] },
    // Numele si statusul companiei sunt copiate in lista de task-uri, pe cardul de
    // deal si in lista de deal-uri castigate din rapoarte.
    companies: { alsoChanges: ["tasks", "deals", "reports"] },
    // Datele contactului principal sunt copiate in listele de companii, task-uri si deal-uri.
    contacts: { alsoChanges: ["companies", "tasks", "deals"] },
    // Marcarea unui deal ca pierdut inchide pe server task-urile legate de el.
    // Rapoartele agrega deal-urile, deci orice schimbare le invecheste.
    deals: { alsoChanges: ["tasks", "reports"] },
    // Permisiunile se schimba doar la o noua autentificare.
    permissions: { staysFreshFor: Number.POSITIVE_INFINITY },
    // Inchiderea unui call schimba statusul companiei, poate crea un deal si
    // intra in raportul de call-uri.
    tasks: { alsoChanges: ["companies", "deals", "reports"] },
  };

  protected getErrorMessage(error: unknown) {
    return getApiErrorMessage(error);
  }

  protected onWriteCompleted(event: WriteEvent<ApiResourceName>) {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const changed = {
      merged: `am actualizat ${event.updatedQueryKeys.length} query-uri din "${event.resourceName}"`,
      reloaded: `nimic de actualizat in "${event.resourceName}"`,
      removed: `am scos inregistrarea din "${event.resourceName}"`,
      skipped: `am lasat "${event.resourceName}" neatins, cum a cerut pagina`,
    }[event.outcome];

    console.debug(
      `[data] ${event.operationName}: ${changed}${event.wasOptimistic ? " (optimist)" : ""}` +
        ` | am re-cerut: ${event.reloadedResources.join(", ") || "nimic"}`,
      [...event.updatedQueryKeys, ...event.reloadedQueryKeys],
    );
  }
}

export const apiDataHandler = new ApiDataHandler();
