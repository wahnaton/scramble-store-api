import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FOURTHWALL_MODULE, IFourthwallModuleService } from '../../../modules/fourthwall'

export const fetchFourthwallProductsStep = createStep(
  'retrieve-products-from-fourthwall',
  async (_, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const fourthwallModule = container.resolve<IFourthwallModuleService>(FOURTHWALL_MODULE)
    const fourthwallProducts = await fourthwallModule.retrieveProducts()
    logger.info(`[sync] fetched ${fourthwallProducts.length} fourthwall products`)
    return new StepResponse(fourthwallProducts)
  },
)
