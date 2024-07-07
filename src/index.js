class CytoscapeDomNode {
    constructor (cy, params = {}) {
        this._cy       = cy;
        this._params   = params;
        this._node_dom = {};

        let cy_container = cy.container();

        if (params.dom_container) {
            this._nodes_dom_container = params.dom_container;
        } else {
            let nodes_dom_container = document.createElement("div");
            nodes_dom_container.style.position = 'absolute';
            nodes_dom_container.style.zIndex = 10;

            let cy_canvas = cy_container.querySelector("canvas");
            cy_canvas.parentNode.appendChild(nodes_dom_container);

            this._nodes_dom_container = nodes_dom_container;
        }

        this._resize_observer = new ResizeObserver((entries) => {
            for (let e of entries) {
                let node_div = e.target;
                let id = node_div.__cy_id;
                let n  = cy.getElementById(id);
                n.style({'width': node_div.offsetWidth, 'height': node_div.offsetHeight, shape: 'rectangle'});
            }
        });

        cy.on('add', 'node', (ev) => {
            this._add_node(ev.target);
        });

        cy.on('remove', 'node', (ev) => {
            this._remove_node(ev.target);
        });

        for (let n of cy.nodes())
            this._add_node(n);

        cy.on("pan zoom", (ev) => {
            let pan  = cy.pan();
            let zoom = cy.zoom();

            let transform = "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")";
            this._nodes_dom_container.style.msTransform = transform;
            this._nodes_dom_container.style.transform = transform;
        });

        cy.on('position bounds', 'node', (ev) => {
            let cy_node = ev.target;
            let id      = cy_node.id();

            if (!this._node_dom[id])
                return;

            let dom = this._node_dom[id];

            let style_transform = `translate(-50%, -50%) translate(${cy_node.position('x').toFixed(2)}px, ${cy_node.position('y').toFixed(2)}px)`;
            dom.style.webkitTransform = style_transform;
            dom.style.msTransform     = style_transform;
            dom.style.transform       = style_transform;

            dom.style.display = 'inline';
            dom.style.position = 'absolute';
            dom.style['z-index'] = 10;
        });
    }

    _add_node (n) {
        let data = n.data();

        if (!data.dom)
            return;

        if (data.skip_node_append !== true) {
            this._nodes_dom_container.appendChild(data.dom);
        }
        data.dom.__cy_id = n.id();

        this._node_dom[n.id()] = data.dom;

        this._resize_observer.observe(data.dom);
    }

    _remove_node (n) {
        let id = n.id();
        let dom = this._node_dom[id];

        if (dom) {
            this._resize_observer.unobserve(dom);
            if (dom.parentNode === this._nodes_dom_container) {
                this._nodes_dom_container.removeChild(dom);
            }
            delete this._node_dom[id];
        }
    }

    node_dom (id) {
        return this._node_dom[id];
    }

    update(id, updateFunction) {
        let node = this._cy.getElementById(id);
        if (!node) {
            console.warn(`Node with id ${id} not found`);
            return;
        }

        let dom = this._node_dom[id];
        if (!dom) {
            console.warn(`DOM element for node ${id} not found`);
            return;
        }

        // Call the update function with the DOM element
        updateFunction(dom);

        // Update the node's data
        node.data('dom', dom);

        // Trigger a position update to ensure proper positioning
        this._cy.trigger('position', ['node', node]);
    }

    remove() {
        // Stop observing all nodes
        for (let id in this._node_dom) {
            this._resize_observer.unobserve(this._node_dom[id]);
        }

        // Remove all DOM nodes
        while (this._nodes_dom_container.firstChild) {
            this._nodes_dom_container.removeChild(this._nodes_dom_container.firstChild);
        }

        // Clear the node_dom object
        this._node_dom = {};

        // Remove event listeners
        this._cy.removeListener('add', 'node');
        this._cy.removeListener('remove', 'node');
        this._cy.removeListener('pan zoom');
        this._cy.removeListener('position bounds', 'node');

        // Remove the container if we created it
        if (!this._params.dom_container) {
            this._nodes_dom_container.parentNode.removeChild(this._nodes_dom_container);
        }

        // Clear references
        this._cy = null;
        this._params = null;
        this._nodes_dom_container = null;
        this._resize_observer = null;
    }
}

function register (cy) {
    if (!cy)
        return;

    cy('core', 'domNode', function (params, opts) {
        return new CytoscapeDomNode(this, params, opts);
    });
}

if (typeof(cytoscape) !== 'undefined') {
    register(cytoscape);
}

module.exports = register;