// Assuming these functions are defined in './addRemoveBlocks'
const { renderText, handleDisplayDiv } = require('./addRemoveBlocks');

function createNetworkGraph() {
    const svg = d3.select('#graph svg');
    const width = document.getElementById('graph').clientWidth;
    const height = document.getElementById('graph').clientHeight;

    // Remove any previous graph content
    svg.selectAll('*').remove();

    // Setup the simulation with forces
    let simulation = d3.forceSimulation(connectedBlocks)
        .force("link", d3.forceLink(blockConnections).id(function (d) { return d.id; }).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(300));

    // Container for zoomable elements
    const container = svg.append("g");

    // Setup zoom and pan behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => container.attr("transform", event.transform));
    svg.call(zoom);

    // Create links
    const link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(blockConnections)
        .enter().append("line")
        .attr("class", "link");

    // Create nodes
    const node = container.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(connectedBlocks)
        .enter().append("g")

    // Create circles for each node
    node.append("circle")
        .attr("r", 5)
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "skyblue")
        .call(drag(simulation));

    // Create labels for each node
    node.append("text")
        .attr('class', 'file-name')
        .text(function (d) { return d.fileName; })
        .attr("x", 10)
        .attr("y", 0)
        .attr("dy", ".35em")
        .on("click", function (event, d) {
            ipcRenderer.send('load-blocks', d.path)
        });

    const triangleSymbol = d3.symbol().type(d3.symbolTriangle).size(80);
    node.append("path")
        .attr("d", triangleSymbol())
        .attr("transform", "translate(0,15)")
        .attr('class', 'toggle')
        .on("click", function (event, d) {
            const noteContent = d3.select(this.parentNode).select(".node-object").select(".note");
            const isRelated = noteContent.classed("is-related");
            noteContent
                .classed("is-related", !isRelated)
        });

    const relatedConnections = findConnectionsById(blockConnections, id);
    node.append("foreignObject")
        .attr('class', "node-object")
        .attr("width", 600)
        .attr("height", 700)
        .attr("x", 0)
        .attr("y", 20)
        .append("xhtml:div")
        .classed("note", true)
        .classed("is-related", d => relatedConnections.includes(d.id))
        .classed("is-current-block", d => d.id === id)
        .html(d => renderText(d.note))
        .on('mouseenter', function () { svg.on('.zoom', null); })
        .on('mouseleave', function () { svg.call(zoom); })

    const notes = d3.selectAll('.note')
    notes.each(function (d) {
        handleDisplayDiv(this)
    })

    simulation
        .on("tick", function () {
            link
                .attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            node
                .attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
        });

    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
            simulation.stop();
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
}

function findConnectionsById(connections, id) {
    let relatedConnections = [];

    connections.forEach(connection => {
        if (connection.source.id === id) {
            relatedConnections.push(connection.target.id);
        } else if (connection.target.id === id) {
            relatedConnections.push(connection.source.id);
        }
    });

    relatedConnections.push(id);

    return relatedConnections;
}