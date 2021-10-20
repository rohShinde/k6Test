const urlReporting = '/api/reporting/graphql'

export function createInvestigation(token, artifactID) {
    let name = "k6Test-" + Math.random().toString(20).substr(2, 6)
    let reportTemplateId = "f09938035bc8418b"
    if (session.baseURL.includes("pro")) { reportTemplateId = "9b7cdfb4bcd208ee" }
    console.log(reportTemplateId)
    
    let payload = `[{"variables":{"wbsCode":"ABC-123-456","primarySubject":"Test","investigationTitle":"${name}","reportTemplateId":"${reportTemplateId}","searchAttributes":[{"attributeName":"individual_name","attributeLabel":"Individual Name","attributeValue":"Test","attributeSource":""}],"artifactId":"${artifactID}","internalSearchQuery":"Test"},"query":"mutation ($artifactId: String!, $investigationTitle: String!, $reportTemplateId: String!, $primarySubject: String, $wbsCode: String, $searchAttributes: [JSON!], $internalSearchQuery: String) {   createInvestigation(artifactId: $artifactId, investigationTitle: $investigationTitle, reportTemplateId: $reportTemplateId, primarySubject: $primarySubject, wbsCode: $wbsCode, searchAttributes: $searchAttributes, internalSearchQuery: $internalSearchQuery) {  ...investigation  __typename   } }  fragment investigation on Investigation {   id   artifactId   createdAt   updatedAt   investigationTitle   reportTemplateId   searchAttributes {  ...searchAttribute  __typename   }   primarySubject   wbsCode   includeExternalSources   refetchLatestData   stagedEntities   internalSearchQuery   activePanels   __typename }  fragment searchAttribute on SearchAttribute {   attributeName   attributeValue   attributeSource   __typename }"}]`
    console.log(payload)

    return (session.post(
        urlReporting,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
            }
        }
    ));
}