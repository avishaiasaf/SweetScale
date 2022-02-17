/**
 * @file Common Utilities module.
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define(['N/record', 'N/format', './moment-with-locales.js', 'N/runtime', 'N/search', 'N/url', 'N/error', './Enums'],
    (record,format,moment, runtime,search,url,error,Enums) => {

            const GLOBAL_LOG = true;
            const General = {};

            /**
             *
             * @param delimiters
             * @param str
             * @returns {*|string[]}
             */
            General.multiSplit = (delimiters, str) =>{
                    let tmp = delimiters[0];
                    for(let i=1;i<delimiters.length;i++){
                            str = str.split(delimiters[i]).join(tmp);
                    }
                    return str.split(tmp);
            }

            /**
             *
             * @param id
             * @param type
             * @param values
             */
            General.recordSubmitFields = (id, type, values) => {
                    let rec = record.load({
                            id: id,
                            type: type
                    });

                    for(const [key, value] of Object.entries(values)){
                            rec.setValue({
                                    fieldId: key,
                                    value: value
                            });
                    }

                    rec.save({
                            ignoreMandatoryFields: true
                    });
            }

            /**
             *
             * @param date
             * @returns {*}
             */
            General.dateToStringMoment = (date)=>{
                    const dateFormat = runtime.getCurrentUser().getPreference ({name: 'DATEFORMAT'});
                    return moment(date).format(dateFormat);
            }

            /**
             *
             * @param date
             * @param utc
             * @returns {string|Date|number}
             */
            General.dateToString = (date, utc=0) =>{
                    if(!date)   return 'Invalid Date';
                    var dateFormat = runtime.getCurrentUser().getPreference ({name: 'DATEFORMAT'});
                    var convertedDate = moment(date).utcOffset(-utc).format(dateFormat);
                    return format.parse({value:convertedDate , type: format.Type.DATE});
            }

            /**
             *
             * @type {{}}
             */
            General.Enums = Enums;

            /**
             *
             * @param f
             * @returns {function(*=): *}
             */
            General.pipe = (...f) =>{
                    return (x) =>{
                            return f.reduce((v, f)=>{
                                    return f(v);
                            }, x);
                    }
            }

            /**
             *
             * @param start
             * @param end
             * @param searchObj
             * @returns {Result[]}
             */
            General.getSearchResults = (start, end, searchObj) =>{
                    return search.create(searchObj).run().getRange({start: start, end: end});
            }

            /**
             *
             * @param scriptId
             * @param deployId
             * @param params
             * @returns {String}
             */
            General.nextPageLink = (scriptId, deployId, params)=>{
                    return url.resolveScript({
                            scriptId: scriptId,
                            deploymentId: deployId,
                            returnExternalURL: false,
                            params: params
                    });
            }

            /**
             *
             * @param key
             * @returns {string}
             */
            General.getConfig = (key) =>{
                    return search.create({
                            type: General.Enums.AccountConfigurationID,
                            filters:
                                [
                                        [General.Enums.AccountConfigurationKey,"is",key]
                                ],
                            columns:
                                [
                                        search.createColumn({name: General.Enums.AccountConfigurationValue, label: "Value"})
                                ]
                    }).run().getRange({
                            start: 0,
                            end: 1
                    })[0].getValue({name: General.Enums.AccountConfigurationValue});
            }

            /**
             *
             * @param local
             * @param context
             * @returns {{debug: *, audit: *, emergency: *, error: *}}
             * @constructor
             */
            General.Log = (local, context) =>{
                    const flag = local && GLOBAL_LOG;

                    const logger = (type, msg, details) => {
                            details = details || '';
                            msg = msg || '';
                            if(context === 'client'){
                                    if(flag) msg instanceof Object ? console.log(msg.title, msg.details) : console.log(msg, details);
                            }else{
                                    if(flag) msg instanceof Object ? log[type](msg.title, msg.details) : log[type](msg, details);
                            }
                    }

                    return {
                            debug: logger.bind(this, 'debug'),
                            audit: logger.bind(this, 'audit'),
                            emergency: logger.bind(this, 'emergency'),
                            error: logger.bind(this, 'error')
                    }
            }

            /**
             *
             * @param searchObj
             * @returns {*[]}
             */
            General.getSearchColumns = (searchObj) =>{
                    const columnNames = [];
                    searchObj[0].columns.forEach((col)=>{
                            columnNames.push(col.label);
                    });
                    return columnNames;
            }

            /**
             *
             * @param str
             * @param symbols
             * @returns {*}
             */
            General.isStartingWith = (str, symbols) =>{
                    return symbols.reduce((ex, sym)=>{
                            return ex + str.indexOf(sym) === 0;
                    }, false);
            }

        /**
         *
         * @param searchResults
         * @returns {*[]}
         */
            General.searchToObject = (searchResults) =>{
                let searchObj = [];
                for(let i=0;i<searchResults.length;i++){
                    let resultLine = {};
                    for(let j=0;j<searchResults[i].columns.length;j++){
                        resultLine[searchResults[i].columns[j]['name']] = {
                            value: searchResults[i].getValue(searchResults[i].columns[j]),
                            text: searchResults[i].getText(searchResults[i].columns[j])
                        }
                    }
                    searchObj.push(resultLine);
                }
                return searchObj;
            }

        /**
         *
         * @param fn
         * @returns {(function(...[*]=): ({result: *, success: boolean}|undefined))|*}
         */
            General.createSafeFunction = (fn) =>{
                return (...args) =>{
                    try{
                        if(fn.length === args.length){
                            return {
                                success: true,
                                result: fn(...args)
                            }
                        }else{
                            throw 'Arguments Mismatch!';
                        }
                    }catch(e){
                        return {
                            success: false,
                            result: 'Error Occurred in ' + (fn.name ? 'function ' + fn.name + ': ' : 'Anonymous function: ') + (e.name ? e.name : e),
                            details: {
                                function: fn.name,
                                parameters: JSON.stringify(args),
                                message: e.message ? e.message : e,
                                stack: e.stack
                            }
                        }
                    }
                }
            }

        /**
         *
         * @param rec
         * @param sublistId
         * @param fields
         * @param labels
         * @returns {(function(*=, *=): *)|*}
         */
        General.getTransactionLinesObj = (rec, sublistId, fields, labels) =>{
            if(!rec){
                return (rec, fields) => {
                    return this.getTransactionLineFunc(rec, sublistId, fields, labels);
                }
            }else if(!sublistId){
                return (sublistId, fields) => {
                    return this.getTransactionLineFunc(rec, sublistId, fields, labels);
                }
            }else{
                return this.getTransactionLineFunc(rec, sublistId, fields, labels);
            }
        }

        /**
         *
         * @param rec
         * @param sublistId
         * @param fields
         * @param labels
         * @returns {*}
         */
        General.getTransactionLineFunc = (rec, sublistId, fields, labels) =>{
            const lineCount = rec.getLineCount({sublistId: sublistId});
            if(fields){
                return this.getTransactionLineLoop(fields, labels, sublistId, lineCount, rec);
            }else{
                return this.getTransactionLineLoop(['id', 'name'], labels, sublistId, lineCount, rec);
            }
        }

        /**
         *
         * @param fields
         * @param labels
         * @param sublistId
         * @param lineCount
         * @param rec
         * @returns {*[]}
         */
        General.getTransactionLineLoop = (fields, labels, sublistId, lineCount, rec) =>{
            const response = [];
            for(let i =0; i<lineCount;i++){
                let responseLine = {};
                fields.forEach((field, index)=>{
                    let label = labels ? labels[index] : field;
                    responseLine[label] = rec.getSublistValue({
                        sublistId: sublistId,
                        fieldId: field,
                        line: i
                    });
                });
                response.push(responseLine);
            }
            return response;
        }

        /**
         *
         * @param recordType
         * @param recordId
         * @returns {string}
         */
        General.recordLink = (recordType, recordId) =>{
            if (!recordType || !recordId) {
                throw error.create('Cannot generate record link. Invalid inputs' + recordType + ' ' + recordId);
            }

            const getAccountDomain = () => {
                return url.resolveDomain({
                    hostType: url.HostType.APPLICATION,
                    accountId: runtime.accountId
                });
            }

            return 'https://' + getAccountDomain() + url.resolveRecord({
                recordType: recordType,
                recordId: recordId,
                isEditMode: false
            });
        }

        /**
         *
         * @param recordType
         * @param recordId
         * @param linkText
         * @returns {string}
         */
        General.recordLinkHTML = (recordType, recordId, linkText) => {
            return '<a href=' + this.recordLink(recordType, recordId, linkText) + '">' + linkText + '</a>';
        }

        /**
         *
         * @param recordId
         * @returns {string}
         */
        General.recordhyperlink = (recordId) => {
            return 'https://system.netsuite.com/app/accounting/transactions/transaction.nl?id=' + recordId;
        }

        /**
         *
         * @param lines
         * @param textCols
         * @returns {*[]}
         */
        General.stringifySearch = (lines, textCols) => {
            const custrecordArray = [];

            if (lines && lines instanceof Array) {
                for (let i = 0; i < lines.length; i++) {
                    const singleLine = {};
                    for (let j = 0; j < lines[0].columns.length; j++) {
                        let column = lines[i].columns[j].name;
                        let value;
                        if(textCols && textCols.indexOf(column)>=0){
                            value = lines[i].getText(lines[i].columns[j]);
                        }else{
                            value = lines[i].getValue(lines[i].columns[j]);
                        }
                        if (this.stringStartsWith(value, ['.', ',', '-.', '-,'])) {
                            value = '0' + value;
                        }
                        singleLine["col" + j] = (value) ? value : '';
                    }
                    custrecordArray.push(singleLine);
                }
            }

            return custrecordArray;
        }

        /**
         *
         * @param id
         * @param type
         * @returns {*}
         */
        General.getObjectNameByID = (id, type) => {
            return search.lookupFields({
                type: type,
                id: id,
                columns: 'name'
            })['name'];
        }

        return {
                ...General,
        }
    });