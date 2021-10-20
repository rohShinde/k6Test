import { check, sleep } from "k6";
import http from "k6/http";

export let options = {
    scenarios: {
        AddToGraph: {
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '60s',
            exec: 'repotingWorkflow'
        }
    },

    thresholds: {
    // 99% of requests must finish within 1000ms.
        http_req_duration: ['p(99) < 2000'],
    }
}

export function setup() {
    let setup = {}
    setup['baseURL'] = __ENV.BASE_URL

    let payload = JSON.stringify(
        {
            api_key: `${__ENV.AUTH_KEY}`,
            consumer_id: `${__ENV.AUTH_USER}`
        }
    );

    let res = http.post(
        'https://dev.missiongraph.io/auth/token',
        payload,
        {
            headers: { "Content-Type": "application/json" }
        }
    );
    sleep(2)

    let bearerToken = JSON.stringify((JSON.parse(res.body)).access_token);
    bearerToken = bearerToken.substr(1, bearerToken.length - 2);
    setup['bearerToken'] = bearerToken

    let searchAPIUrl = '/exapi/graphql'
    let acceptValue = '*/*'
    let conType = 'application/json'
    if (__ENV.SEARCH_PROVIDER.includes('internal')) {
        payload = `{"sources":[{"name":"internal","limit":20,"props":{}}],"facets":[{"field":"mg_entity_type","limit":30}],"limit":10000,"params":{"clauses":[{"properties":[{"propertyName":"mg_display_label","values":["Test"],"matchType":"text"}],"operator":"AND"}],"operator":"AND"}}`
        searchAPIUrl = '/api/search/federated'
        acceptValue = 'application/json, text/plain, */*'
        conType = 'application/json; charset=UTF-8'
    } else {
        let extSearchProvider = (__ENV.SEARCH_PROVIDER.split("#"))[0]  //"pipl#search"
        let extSearchType = (__ENV.SEARCH_PROVIDER.split("#"))[1]
        payload = `{"variables":{"slug":"${extSearchProvider}","endpoint":"${extSearchType}","params":{"individual_name":"Test"}},"query":"query ($slug: String!, $endpoint: String!, $params: JSON, $primaryId: String, $ingest: Boolean) {   exapi(slug: $slug, endpoint: $endpoint, params: $params, primaryId: $primaryId, ingest: $ingest) {  name  endpoint  timestamp  records {  primary {   id   label   type   op   properties   src {   label   id   __typename   }   dst {   label   id   __typename   }   provenance {   sourceDatasetId   __typename   }   __typename  }  related {   id   label   type   op   properties   src {   label   id   __typename   }   dst {   label   id   __typename   }   provenance {   sourceDatasetId   __typename   }   __typename  }  hasDetails {   endpoint   params   __typename  }  __typename  }  __typename   } } "}`
    }

    res = http.post(
        `${__ENV.BASE_URL}${searchAPIUrl}`,
        payload,
        {
            headers: {
                accept: acceptValue,
                authorization: `Bearer ${bearerToken}`,
                "content-type": conType
            }
        }
    );
    sleep(5)
    
    if (__ENV.SEARCH_PROVIDER.includes('internal')) {
        setup['entityID'] = (JSON.parse(res.body)).results[0].records[0].primary.properties.id
        setup['entityLabel'] = (JSON.parse(res.body)).results[0].records[0].primary.properties.label
        setup['entityDisplayLabel'] = (JSON.parse(res.body)).results[0].records[0].primary.properties.mg_display_label
    } else {
        setup['entityID'] = (JSON.parse(res.body)).data.exapi.records[0].primary.id
        setup['entityLabel'] = (JSON.parse(res.body)).data.exapi.records[0].primary.label
        setup['entityDisplayLabel'] = (JSON.parse(res.body)).data.exapi.records[0].primary.properties.mg_display_label
    }
    
    return setup;
}

export function repotingWorkflow(setup) {
    let name = "k6-" + Math.random().toString(20).substr(2, 6)
    let payload = `[{"variables":{"artifact":{"type":"REPORTING","name":"${name}","data":{"elementIds":[],"pendingIds":[],"navigation":null,"version":8,"mergedIds":[],"timebar":{"active":false,"settings":null},"queries":[],"highlights":{},"cardinality":"any","directed":false,"analyticType":"","filters":{},"subfilters":{},"layout":"Standard","hiddenNodeIds":[],"primaryNodes":[],"paths":[],"combos":[],"chart":{},"viewOptions":null,"viewportShape":null,"usingUUIDS":true,"tree":{"id":"root","children":[]}}}},"query":"mutation ($artifact: CreateArtifactInput!) {\\n  createArtifact(artifact: $artifact) {\\n    ...artifact\\n    subscribers {\\n      ...subscriber\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment artifact on Artifact {\\n  id\\n  data\\n  name\\n  user_id\\n  is_owner\\n  type\\n  preview\\n  created_at\\n  updated_at\\n  __typename\\n}\\n\\nfragment subscriber on ArtifactSubscriber {\\n  user_id\\n  artifact_id\\n  is_owner\\n  roles\\n  subscriber_id\\n  created_at\\n  updated_at\\n  __typename\\n}\\n"}]`
    
    let res = http.post(
        `${setup['baseURL']}/api/workspaces/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(2)
    check(res, {
        'Create Artifact status is 200': (r) => r.status === 200,
    })
    
    let artifactID = JSON.parse(res.body)[0].data.createArtifact.id
    console.log(artifactID)

    payload = `[{"variables":{"wbsCode":"ABC-123-456","primarySubject":"Test","investigationTitle":"k6-Test","reportTemplateId":"cbae3c5c5b30792e","searchAttributes":[{"attributeName":"individual_name","attributeLabel":"Individual Name","attributeValue":"Test","attributeSource":""}],"artifactId":"${artifactID}","internalSearchQuery":"Test"},"query":"mutation ($artifactId: String!, $investigationTitle: String!, $reportTemplateId: String!, $primarySubject: String, $wbsCode: String, $searchAttributes: [JSON!], $internalSearchQuery: String) {   createInvestigation(artifactId: $artifactId, investigationTitle: $investigationTitle, reportTemplateId: $reportTemplateId, primarySubject: $primarySubject, wbsCode: $wbsCode, searchAttributes: $searchAttributes, internalSearchQuery: $internalSearchQuery) {  ...investigation  __typename   } }  fragment investigation on Investigation {   id   artifactId   createdAt   updatedAt   investigationTitle   reportTemplateId   searchAttributes {  ...searchAttribute  __typename   }   primarySubject   wbsCode   includeExternalSources   refetchLatestData   stagedEntities   internalSearchQuery   activePanels   __typename }  fragment searchAttribute on SearchAttribute {   attributeName   attributeValue   attributeSource   __typename }"}]`

    res = http.post(
        `${setup['baseURL']}/api/reporting/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(3)
    check(res, {
        'Create Investigation status is 200': (r) => r.status === 200,
    })
    
    let investigationID = (JSON.parse(res.body))[0].data.createInvestigation.id

    payload = `[{"variables":{"stagedEntities":[{"id":"${setup['entityLabel']}:${setup['entityID']}","label":"${setup['entityDisplayLabel']}","type":"individual","source":"${setup['extSearchProvider']}","pending":true}],"id":"${investigationID}","artifactId":"${artifactID}"},"query":"mutation ($id: String!, $artifactId: String!, $stagedEntities: [JSON!]) {  updateInvestigation(id: $id, artifactId: $artifactId, stagedEntities: $stagedEntities) { id artifactId stagedEntities __typename }}"}]`
    res = http.post(
        `${setup['baseURL']}/api/reporting/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(5)
    check(res, {
        'Update Investigation with searched entity status is 200': (r) => r.status === 200,
    })

    payload = `[{"variables":{"investigationId":"${investigationID}"},"query":"query (\$investigationId: String!) {  reportDataAttributes(investigationId: \$investigationId) { id attributeName attributeValues sectionName sectionIndex investigationId isVerified __typename }}"},{"variables":{"id":"${investigationID}"},"query":"query (\$id: String!) { reportTemplate(id: \$id) { template __typename }}"}]`
    res = http.post(
        `${setup['baseURL']}/api/reporting/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(5)
    check(res, {
        'Update report attributes status is 200': (r) => r.status === 200,
    })

    payload = `[{"variables":{"investigationId":"${investigationID}","artifactId":"${artifactID}"},"query":"mutation (\$investigationId: String!, \$artifactId: String!) { createReport(investigationId: \$investigationId, artifactId: \$artifactId) { url objectKey __typename } }"}]`
    res = http.post(
        `${setup['baseURL']}/api/reporting/graphql`,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${setup['bearerToken']}`,
                "content-type": "application/json",
            }
        }
    );
    sleep(10)
    check(res, {
        'Generate report status is 200': (r) => r.status === 200,
    })
}