/**
 * @NApiVersion 2.1
 */
define(['./General'],
    (General)=>{

        /**
         *
         * @param scriptId
         * @param deployId
         * @param params
         * @param ignoreLeave
         */
            General.nextPage = (scriptId, deployId, params, ignoreLeave) =>{

                    if(ignoreLeave && window.onbeforeunload){
                            window.onbeforeunload = () => { null; }
                    }

                    window.open(General.nextPageLink(scriptId, deployId, params), "_self");
            }

            return General;
    });