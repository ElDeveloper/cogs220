#!/usr/bin/env python

import networkx as nx

from sys import argv
from biom import example_table as et
from biom import load_table
from itertools import permutations

def make_graph(bt, shared_otus):
    """Make a graph out of shared OTUs

    Parameters
    ----------
    bt : bt.Table
        BIOM table, must have a 'taxonomy' metadata attribute for their
        observations.
    shared_otus : int
        Minimum number of shared OTUs to create an edge between two samples.

    Returns
    -------
    nx.Graph
        Graph object with the minimum number of shared OTUs.
    """
    graph = nx.Graph()
    kpc = ['k', 'p', 'c', 'o', 'f', 'g', 's']

    for o in bt.ids('observation'):
        vec = (bt.data(o, axis='observation') >= shared_otus)

        # instead of the samples themselves, these should be the latitudes
        # and longitudes
        samples = bt.ids()[vec]

        if len(samples) > 1:
            tax = bt.metadata(o, 'observation')['taxonomy']

            # pad with empty strings
            tax = tax + ((len(kpc) - len(tax)) * ['unclassified'])

            metadata = dict(zip(kpc, tax))

            for pair in permutations(samples, 2):
                graph.add_edge(pair[0], pair[1], metadata)

    return graph

if __name__ == '__main__':

    if len(argv) == 2:
        g = make_graph(load_table(argv[1]), 10)
    if len(argv) == 3:
        g = make_graph(load_table(argv[1]), int(argv[2]))
    else:
        print("Running a demo.")
        g = make_graph(et, 2)

    print('Edges: %d, Nodes: %d' % (g.number_of_edges(),
          g.number_of_nodes()))
