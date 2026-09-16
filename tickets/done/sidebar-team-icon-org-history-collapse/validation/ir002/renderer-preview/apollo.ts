export const getApolloClient=()=>({query:async()=>{throw new Error('No network in renderer fixture')}});
