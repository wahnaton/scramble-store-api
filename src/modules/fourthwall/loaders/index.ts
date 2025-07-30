import { LoaderOptions } from "@medusajs/framework/types"
import { asClass } from "awilix"
import  FourthwallService from "../service"

export default async function registerServiceLoader({ container }: LoaderOptions) {
  container.register({
    fourthwallService: asClass(FourthwallService).singleton(),
  })
}