export enum BagStatus {
  open = "open",
  sealed = "sealed",
  in_transit = "in_transit",
  delivered = "delivered",
}

export interface Bag {
  id: string;
  bagCode: string;
  status: BagStatus;
  originRegionId: string;
  destRegionId: string;
}