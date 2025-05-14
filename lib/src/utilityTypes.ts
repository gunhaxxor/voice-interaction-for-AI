
export type PossibleLanguagesBCP47 = 'en-US' | 'en-GB' | 'sv-SE' | (string & {})
export type PossibleLanguagesISO6391 = 'en' | 'sv' | (string & {})
export type StringWithSuggestedLiterals<T extends string> = T | (string & {})

export type MaybeHandler<T extends Array<unknown>> = undefined | ((...args: T) => void)

// type MyHandler = MaybeHandler<[newState: string, prevState: string]>
// type MyOtherHandler = MaybeHandler<[data: Array<string>]>


// const asdf: MyHandler = (newState: string, prevState: string) => {
//   console.log(newState, prevState);
// }

// const lkj: MyOtherHandler = (ppp: Array<string>) => {
  
// }

// const ljhh: MyHandler = undefined;