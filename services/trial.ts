export type TrialTiming={endDate:Date;daysRemaining:number};
export function trialTiming(expiresAt?:string):TrialTiming|null{if(!expiresAt)return null;const endDate=new Date(expiresAt);if(Number.isNaN(endDate.valueOf()))return null;return {endDate,daysRemaining:Math.max(0,Math.ceil((endDate.valueOf()-Date.now())/86_400_000))};}
