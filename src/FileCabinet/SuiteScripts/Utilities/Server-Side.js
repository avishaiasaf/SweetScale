/**
 * @NApiVersion 2.1
 */

define(['./General', 'N/https', 'N/compress', 'N/file', 'N/redirect', 'N/url', 'N/ui/serverWidget', 'N/task'],
    (General, https, compress, file, redirect, url, ui, task)=>{

            /**
             *
             * @param onGet
             * @param onPost
             * @param context
             */
            General.createSuitelet = (onGet, onPost, context) =>{

                    General.getResParam = (param) =>{
                            // log.debug('Param', param);
                            return commonUtils.multiSplit(['\u0001', '\u0002'], context.request.parameters[param]);
                    }

                    General.getSimpleParam = (param) => {
                            return context.request.parameters[param]
                    }

                    General.getReqParam = (param) =>{
                            return context.request.parameters[param];
                    }

                    const eventRouter = {};
                    eventRouter[https.Method.GET] = onGet;
                    eventRouter[https.Method.POST] = onPost;

                    try{
                            eventRouter[context.request.method](context);
                    }catch(e){
                            log.debug('Error Ocurred In Suitelet::', e);
                    }
            }

            /**
             *
             * @param title
             * @returns {{addButtons: addButtons, addSublistButtons: addSublistButtons, form: Form, addFields: (function(*): Form), addFieldGroups: addFieldGroups, addSublists: (function(*): *[])}}
             */
            General.createForm = (title) =>{
                    const form = ui.createForm({
                            title: title
                    });

                    return {
                            form,
                            addFields: (fields) => {
                                    fields.forEach((field)=>{

                                            const currentField = form.addField({
                                                    id: field.id,
                                                    label: field.label,
                                                    type: field.type.toString().toLowerCase(),
                                                    source: field.source || '',
                                                    container: field.container || ''
                                            });

                                            field.sourceSearch && commonUtils.addSelectOptions(currentField, field.sourceSearch);
                                    });
                                    return form;
                            },
                            addFieldGroups: (fieldGroups) =>{
                                    fieldGroups && fieldGroups.forEach((group)=>{
                                            form.addFieldGroup({
                                                    id: group.id,
                                                    label: group.label
                                            });
                                    });
                            },
                            addButtons: (buttons)=>{
                                    buttons.forEach((button)=>{
                                            form[button.type]({
                                                    id: button.id || '',
                                                    label: button.label,
                                                    functionName: button.functionName || ''
                                            });
                                    });
                            },
                            addSublists: (sublists)=>{
                                    const sublistObj = [];
                                    sublists.forEach((sublist)=>{
                                            sublistObj.push(commonUtils.addSublistFields(form.addSublist({
                                                    id : sublist.id,
                                                    type : sublist.type,
                                                    label : sublist.label
                                            }), sublist.fields, sublist.fieldTypes));
                                    });
                                    return sublistObj;
                            },
                            addSublistButtons: (sublist, buttons) =>{
                                    buttons.forEach((button)=>{
                                            sublist[button.type]({
                                                    id: button.id,
                                                    label: button.label,
                                                    functionName: button.functionName
                                            });
                                    })
                            }
                    }
            }

            /**
             *
             * @param lineValues
             * @param sublist
             * @param line
             * @param sublistFields
             */
            General.updateSublistLine = (lineValues, sublist, line, sublistFields) =>{
                    Object.entries(lineValues).forEach((col, i)=>{
                            const current = sublistFields[i].toString().toLowerCase();
                            const hasAttr = sublistFields[i].indexOf('_') >= 0;
                            const field = hasAttr ? current.substr(0, current.indexOf('_')) : current;
                            sublist.setSublistValue({
                                    id: field.toString().toLowerCase(),
                                    line: line,
                                    value: lineValues[field.toString().toLowerCase()] || ' '
                            });
                    });
            }

            /**
             *
             * @param scriptId
             * @param deployId
             * @param params
             */
            General.nextPage = (scriptId, deployId, params) => {
                    redirect.redirect({
                            url: commonUtils.nextPageLink(scriptId, deployId, params)
                    });
            }

            /**
             *
             * @param files
             * @param fileName
             * @param folderId
             * @returns {null|*}
             */
            General.compressFiles = (files, fileName, folderId) =>{
                    if(typeof files === 'object'){
                            const archiver = compress.createArchiver();

                            Object.keys(files).forEach((fileObj)=>{
                                    fileObj && archiver.add({
                                            file: file.load({
                                                    id: fileObj
                                            }),
                                            directory: files[fileObj]
                                    });
                            })

                            const zipFile = archiver.archive({
                                    name: fileName + '_' + new Date() + '_.zip'
                            });

                            zipFile.folder = folderId;

                            return zipFile.save();
                    }else{
                            return null;
                    }
            }

            /**
             *
             * @param field
             * @param sData
             * @returns {*}
             */
            General.addSelectOptions = (field, sData) =>{
                    General.buildSearch(sData).run().each((result)=>{
                            field.addSelectOption({
                                    value: result.getValue(result.columns[1]),
                                    text: result.getValue(result.columns[0])
                            });
                            return true;
                    });
                    return field;
            }

            /**
             *
             * @param sublist
             * @param fields
             * @param fieldTypes
             * @returns {*}
             */
            General.addSublistFields = (sublist, fields, fieldTypes) => {
                    fields.forEach((field, i)=>{
                            const hasAttr = field.indexOf('_') >= 0;
                            const attribute = hasAttr ? field.substr(field.indexOf('_') + 1) : 'View';
                            const fieldId = hasAttr ? field.substr(0, field.indexOf('_')) : field;
                            const sublistField = sublist.addField({
                                    id: fieldId.toString().toLowerCase(),
                                    type: fieldTypes[i].toString().toUpperCase(),
                                    label: hasAttr ? field.substr(0, field.indexOf('_')) : field
                            });
                            if(fieldTypes[i] === 'url')     sublistField.linkText = attribute;
                    });

                    return sublist;
            }

            /**
             *
             * @param id
             * @returns {string}
             */
            General.getFileUrl = (id) =>{
                    return file.load({
                            id: id
                    }).url;
            }

            /**
             *
             * @param type
             * @param scriptId
             * @param deployId
             * @param params
             * @returns {*}
             */
            General.runTask = (type, scriptId, deployId, params) =>{
                    const taskType = {
                            'schedule': 'SCHEDULED_SCRIPT',
                            'map': 'MAP_REDUCE',
                            'csv': 'CSV_IMPORT',
                            'duplication': 'ENTITY_DEDUPLICATION',
                            'workflow': 'WORKFLOW_TRIGGER',
                            'search': 'SEARCH',
                            'record': 'RECORD_ACTION'
                    };

                    const scheduledScript = task.create({
                            taskType: taskType[type]
                    });

                    scheduledScript.scriptId = scriptId;
                    scheduledScript.deploymentId = deployId;
                    scheduledScript.params = params;
                    return scheduledScript.submit();
            }

            return General;
    });