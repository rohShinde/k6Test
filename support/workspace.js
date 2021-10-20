const urlWorkspace = '/api/workspaces/graphql'

export function createGraphWorkspace(token) {
    return createWorkspace("GRAPH", token)
}

export function createMapWorkspace(token) {
    return createWorkspace("MAP", token)
}

export function createReportingWorkspace(token) {
    return createWorkspace("REPORTING", token)
}

function createWorkspace(type, token) {
    let name = "k6-" + Math.random().toString(20).substr(2, 6)
    let payload = `[{"variables":{"artifact":{"type":"${type}","name":"${name}","data":{"elementIds":[],"pendingIds":[],"navigation":null,"version":8,"mergedIds":[],"timebar":{"active":false,"settings":null},"queries":[],"highlights":{},"cardinality":"any","directed":false,"analyticType":"","filters":{},"subfilters":{},"layout":"Standard","hiddenNodeIds":[],"primaryNodes":[],"paths":[],"combos":[],"chart":{},"viewOptions":null,"viewportShape":null,"usingUUIDS":true,"tree":{"id":"root","children":[]}}}},"query":"mutation ($artifact: CreateArtifactInput!) {createArtifact(artifact: $artifact) {...artifact subscribers {...subscriber __typename} __typename} } fragment artifact on Artifact { id data name user_id is_owner type preview created_at updated_at __typename } fragment subscriber on ArtifactSubscriber { user_id artifact_id is_owner roles subscriber_id created_at updated_at __typename } "}]`
    
    let res = session.post(
        urlWorkspace,
        payload,
        {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
            }
        }
    );
    return (JSON.parse(res.body)[0].data.createArtifact.id)
}