import { DataPage } from "orval-data-handler";

import type {
  CompanyListItemDto,
  PagedCompaniesResponse,
} from "@/service-api/generated/models";

import type { ContactForm } from "../components/companies/edit-contact-dialog";

/**
 * Pagina de companii, pe partea de date. Randurile, paginarea, starea incarcarii si
 * `reload` vin din `DataPage`; aici sta doar ce e specific paginii.
 */
export class CompaniesDataPage extends DataPage<PagedCompaniesResponse> {
  /** Formularul de editare a contactului principal, completat din companie. */
  getContactForm(company: CompanyListItemDto): ContactForm {
    return {
      email: company.primaryContactEmail ?? "",
      jobTitle: company.primaryContactJobTitle ?? "",
      phone: company.primaryContactPhone ?? "",
    };
  }
}
