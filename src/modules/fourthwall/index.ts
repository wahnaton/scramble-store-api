import FourthwallModuleService from "./service"
import { Module } from "@medusajs/utils"

export const FOURTHWALL_MODULE = "fourthwall"

export default Module(FOURTHWALL_MODULE, {
  service: FourthwallModuleService,
})