
export type PossibleLanguages = 'en-US' | 'en-GB'| 'sv-SE' | (string & {})

export type MaybeHandler<T extends Array<unknown>> = undefined | ((...args: T) => void)

// type MyHandler = MaybeHandler<[newState: string, prevState: string]>
// type MyOtherHandler = MaybeHandler<[data: Array<string>]>


// const asdf: MyHandler = (newState: string, prevState: string) => {
//   console.log(newState, prevState);
// }

// const lkj: MyOtherHandler = (ppp: Array<string>) => {
  
// }

// const ljhh: MyHandler = undefined;