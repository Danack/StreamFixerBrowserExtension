import { SiteConfig } from "../interfaces/interfaces";
import { GetVideoNameCb } from "../interfaces/interfaces";
import { StateParticipantList } from "../interfaces/interfaces";
import { CrawledParticipant } from "../interfaces/interfaces";
import { log } from "./log";

/**
 * The stuff in this file is mostly dealing with the original DOM content
 */

/**
 * Determines if the current site is supported, or not by our extension.
 *
 * Returns null if not, and a configured SiteConfig object if it is.
 *
 * When adding a new site, this function is the only one that should be modified with the new configuration.
 */
export function getSiteConfig(): SiteConfig {
    const url = window.location.href;
    // TEST PAGE
    if (document.getElementById('testarea') !== null) {
        return {
            name: "Test",
            getVideoName: (videoNode: Element) => videoNode.closest('div').querySelector('span').innerText
        };
    }

    // WHEREBY
    if (url.match(/.*whereby.com\/[^/]+/g) && !url.match(/.*whereby.com\/user/g)) {
        return {
            name: "whereby",
            getVideoName: (videoNode: Element) => (videoNode.closest('div[class^="content-"]').querySelector('[class^="nameBanner-"]') as any).innerText
        }
    }

    // JITSI
    if (url.match(/.*meet.jit.si\/[^/]+/g) !== null) {
        return {
            name: "jitsy",
            getVideoName: (videoNode: Element) => {
                return videoNode.closest('.videocontainer').querySelector('.displayname').innerHTML;
            }
        }
    }

    return null;
}

/**
 * Wrapper for firefox's mozCaptureStream and chrome's captureStream method.
 * @param node
 */
export function captureStream(node: any) {
    if (node.captureStream) {
        return node.captureStream();
    } else if (node.mozCaptureStream) {
        return node.mozCaptureStream();
    }

    console.error("This is an unsupported browser.");
    return null;
}

/**
 * Lists the current participants from the current page's DOM tree.
 * @param getvideoName
 */
export const getPageParticipants = (getvideoName: GetVideoNameCb): CrawledParticipant[] => {

    let elements: CrawledParticipant[] = [];

    document.querySelectorAll('video:not(.sfVideo)').forEach((node: HTMLVideoElement) => {
        if (!node.srcObject || !(node.srcObject as any).id) {
            return;
        }
        // log("GETTING NAME FOR ...", node)
        let name = null;
        try {
            name = getvideoName(node)
        } catch (e) {
            // log(e); // doesn't matter.
            return; // The getVideoName was unable to determine the name.
        }
        // log("RESULT: ", name)

        if (name === null || name === "") {
            return;
        }

        elements.push({
            streamId: (node.srcObject as any).id,
            name,
            node
        });
    });

    // log("------------------");
    return elements;

};

/**
 * Handles the merging of the DOM participants into the State's participant lists.
 *
 * If a new participant arrived, it adds it, otherwise it checks if the stream is still the same.
 * So when someone reconnects, their view gets updated again.
 *
 * @param stateParticipants
 * @param pageParticipants
 */
export function updateStateParticipants(stateParticipants: StateParticipantList, pageParticipants: CrawledParticipant[]) {
    const updatedStateParticipants: StateParticipantList = { ...stateParticipants };
    let changed = false;

    for (const pp of pageParticipants) {
        const now = updatedStateParticipants[ pp.name ];
        if (now) {
            // We had this participant already

            if (now.currentStreamId != pp.streamId || !(now.stream instanceof MediaStream)) {
                // But their stream is changed, or it wasn't a stream originally.
                log("Updating participant...");
                changed = true;
                now.stream = captureStream(pp.node);
                now.currentStreamId = pp.streamId;
                now.lastUpdate =  Date.now();
            }
        } else {
            // We didn't knew this participant before, add him/her.
            const stream = captureStream(pp.node);
            if (stream !== null && stream instanceof MediaStream && stream.active) {
                // There is a stream, and it is working, etc...
                changed = true;
                log("Adding new participant...");
                updatedStateParticipants[ pp.name ] = {
                    currentStreamId: pp.streamId,
                    index: Object.keys(updatedStateParticipants).length,
                    name: pp.name,
                    stream,
                    lastUpdate: Date.now(),
                }
            }
        }
    }

    if (!changed) {
        return null;
    }
    log("CHANGED:", changed);
    return updatedStateParticipants;
}