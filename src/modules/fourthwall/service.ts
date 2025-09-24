import { FourthwallClient, fourthwallClient } from './fourthwall-client'
import { FourthwallProduct } from './fourthwall-types'

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
