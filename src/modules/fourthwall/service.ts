import { FourthwallClient, FourthwallProduct, fourthwallClient } from "./fourthwall-client"

export interface IFourthwallModuleService {
  retrieveProducts(): Promise<FourthwallProduct[]>
}

class FourthwallModuleService implements IFourthwallModuleService {
  private readonly fourthwallClient: FourthwallClient = fourthwallClient

  async retrieveProducts(): Promise<FourthwallProduct[]> {
    return this.fourthwallClient.listProducts()
  }
}

export default FourthwallModuleService