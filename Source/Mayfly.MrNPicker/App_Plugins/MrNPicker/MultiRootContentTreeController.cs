using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http.Formatting;
using Umbraco.Core;
using Umbraco.Core.Logging;
using Umbraco.Core.Models;
using Umbraco.Web;
using Umbraco.Web.Models.Trees;
using Umbraco.Web.Trees;

namespace Mayfly.MrNPicker.App_Plugins.MrNPicker
{
    [Tree("customcontent", "customcontent", "CustomContent")]
    public class MultiRootContentTreeController : ContentTreeController
    {
        private UmbracoHelper _umbHelper;

        /// <summary>
        /// Overwrite to grab multiple root nodes on initial load
        /// </summary>
        /// <param name="id"></param>
        /// <param name="queryStrings"></param>
        /// <returns></returns>
        protected override TreeNodeCollection PerformGetTreeNodes(string id, FormDataCollection queryStrings)
        {
            if (id != "-1")
            {
                return base.PerformGetTreeNodes(id, queryStrings);
            }

            _umbHelper = new UmbracoHelper(UmbracoContext);
            var pageId = Convert.ToInt32(queryStrings.Get("pageID"));
            
            var treeNodes = new TreeNodeCollection();

            var rootNodes = queryStrings
                .Get("rootIds")
                .Split(new []{','}, StringSplitOptions.RemoveEmptyEntries)
                .Select(i => _umbHelper.TypedContent(i))
                .ToList();

            if (queryStrings.HasKey("xpath") && !string.IsNullOrEmpty(queryStrings.Get("xpath")))
            {
                var xPaths = queryStrings.Get("xpath");

                foreach (var xpath in xPaths.Split(new[] {';'}, StringSplitOptions.RemoveEmptyEntries))
                {
                    ParseXPath(rootNodes, xpath, pageId);
                }
            }

            var mergeRoots = queryStrings.Get("mergeRoots") == "1";

            var roots = new List<string>();

            if (mergeRoots)
            {
                // We need to sort by level first, so that we can filter by path
                rootNodes = rootNodes.OrderBy(i => i.Level).ToList();

                foreach (var sortedNode in rootNodes)
                {
                    var sortedNodeId = sortedNode
                        .Id
                        .ToString(CultureInfo.InvariantCulture);

                    var nodePath = sortedNode
                        .Path
                        .Split(new[] { ',' }, StringSplitOptions.RemoveEmptyEntries)
                        .ToList();
                    
                    if (nodePath.ContainsAny(roots))
                    {
                        continue;
                    }

                    roots.Add(sortedNodeId);
                }
            }
            else
            {
                roots = rootNodes
                    .DistinctBy(i => i.Id)
                    .Select(i => i.Id.ToString(CultureInfo.InvariantCulture))
                    .ToList();
            }

            treeNodes.AddRange(roots.Select(rootId => GetTreeNode(rootId, queryStrings)));

            return treeNodes;
        }

        /// <summary>
        /// Parse a set of root ids with xpath and page id
        /// </summary>
        /// <param name="rootIds"></param>
        /// <param name="xpath"></param>
        /// <param name="pageId"></param>
        private void ParseXPath(List<IPublishedContent> rootIds, string xpath, int pageId)
        {
            try
            {
                var xpathExpression = ParseXPathQuery(xpath, pageId);
                var nodes = _umbHelper
                    .TypedContentAtXPath(xpathExpression)
                    .ToList();

                if (nodes.Any())
                {
                    rootIds.AddRange(nodes);
                }
            }
            catch (Exception ex)
            {
                LogHelper.Error(typeof (MultiRootContentTreeController),
                                "Error fetching content by xpath: [[ " + xpath + " ]]", ex);
            }
        }

        /// <summary>
        /// Parse the XPath query
        /// </summary>
        /// <param name="query"></param>
        /// <param name="id"></param>
        /// <returns></returns>
        private string ParseXPathQuery(string query, int id)
        {
            // no need to parse it
            if (!query.StartsWith("$"))
            {
                return query;
            }
            
            const string rootXpath = "descendant::*[@id={0}]";

            // parseable items:
            var items = new Dictionary<string, Func<string, string>>
                {
                    {
                        "$current", q =>
                            {
                                var pathId = OnGetClosestPublishedAncestor(GetPath(id));
                                return q.Replace("$current", string.Format(rootXpath, pathId));
                            }
                    },
                    {
                        "$parent", q =>
                            {
                                // remove the first item in the array if its the current node
                                // this happens when current is published, but we are looking for its parent specifically
                                var path = GetPath(id);
                                if (path.ElementAt(0) == id.ToString(CultureInfo.InvariantCulture))
                                {
                                    path = path
                                        .Skip(1)
                                        .ToList();
                                }

                                var pathId = OnGetClosestPublishedAncestor(path);
                                return q.Replace("$parent", string.Format(rootXpath, pathId));
                            }
                    },
                    {
                        "$site", q =>
                            {
                                var pathId = OnGetClosestPublishedAncestor(GetPath(id));
                                return q.Replace("$site",
                                                 string.Format(rootXpath, pathId) + "/ancestor-or-self::*[@level = 1]");
                            }
                    },
                    {"$root", q => q.Replace("$root", string.Empty)}
                };

            foreach (var varible in items)
            {
                if (!query.StartsWith(varible.Key)) continue;

                query = varible.Value.Invoke(query);
                break;
            }

            return query;
        }

        /// <summary>
        /// Get nearest published item
        /// </summary>
        /// <param name="path"></param>
        /// <returns></returns>
        private int OnGetClosestPublishedAncestor(IEnumerable<string> path)
        {
            var nodes = path
                .Select(nodeId => Umbraco.TypedContent(int.Parse(nodeId)))
                .Where(item => item != null);

            foreach (var item in nodes)
            {
                return item.Id;
            }

            return -1;
        }

        /// <summary>
        /// Get full path
        /// </summary>
        /// <param name="nodeid"></param>
        /// <returns></returns>
        private IList<string> GetPath(int nodeid)
        {
            var ent = Services
                .EntityService
                .Get(nodeid);

            return ent
                .Path
                .Split(',')
                .Reverse()
                .ToList();
        }
    }
}