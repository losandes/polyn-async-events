// Type definitions for @polyn/async-events
// Project: https://github.com/losandes/polyn-async-events
// Definitions by: Andy Wright <https://github.com/losandes>
// TypeScript Version: 2.1

export interface IEventMeta {
  id: string;
  time: number;
  topic: string;
  name: string;
  subscriptionId: string;
}

export interface IEventOutput {
  count: number;
  meta: {
    id: string;
    time: number;
    topic: string;
    event: string;
  };
  results?: any[]; // the subscriptions output
}

export interface IReceiver {
  (body: any, meta: IEventMeta): any | Promise<any>;
}

export interface ISubscription {
  id: string;
  receiver: IReceiver;
}

export interface ISubscriptionResult {
  subscriptionId: string;
}

export interface ITopicRepo {
  subscribe (names: string | string[], receiver: IReceiver): Promise<ISubscriptionResult|ISubscriptionResult[]>;
  unsubscribe (id: string): Promise<boolean>;
  getSubscriptions (name: string): Promise<ISubscription[]>;
  hasSubscriptions (name: string): Promise<boolean>;
}

interface ITopicOptions {
  topic: string;
  repo?: ITopicRepo;               // default is in memory repo
}

export interface ITopic {
  name: string;
  publish (name: string, body: any, meta?: any): Promise<IEventOutput>;
  emit (name: string, body: any, meta?: any): Promise<IEventOutput>;
  subscribe (names: string | string[], receiver: IReceiver): Promise<ISubscriptionResult|ISubscriptionResult[]>;
  unsubscribe (id: string): Promise<boolean>;
}

declare class Topic implements ITopic {
  constructor (options: ITopicOptions);
  name: string;
  publish (name: string, body: any, meta?: any): Promise<IEventOutput>;
  emit (name: string, body: any, meta?: any): Promise<IEventOutput>;
  subscribe (names: string | string[], receiver: IReceiver): Promise<ISubscriptionResult|ISubscriptionResult[]>;
  unsubscribe (id: string): Promise<boolean>;
}
