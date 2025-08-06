import { FourthwallClient, FourthwallProduct, fourthwallClient } from "./fourthwall-client"

class FourthwallModuleService {
  private readonly fourthwallClient: FourthwallClient = fourthwallClient

  async retrieveProducts(): Promise<FourthwallProduct[]> {
    return this.fourthwallClient.listProducts()
  }
}

export default FourthwallModuleService