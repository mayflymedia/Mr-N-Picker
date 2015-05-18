# Mr N Picker
Mr N Picker is a Multi-Root Node Picker for Umbraco 7, built as a part of Project Yoxo.

#### Why would I want multiple root nodes in a MNTP?
This package allows a developer to create a clean tree structure based on multiple root nodes, without having to select a shared parent node or include items that aren't relevant to the content editor.

## Getting Started
This package was built against Umbraco 7.2.1, but is supported across all current versions of Umbraco 7.

#### Installation
Mr N Picker is available from Our Umbraco, NuGet, or as a manual install directly from GitHub.

#### Our Umbraco repository
You can find a downloadable package, along with a discussion forum for this package on the [Our Umbraco](http://our.umbraco.org) site.

#### NuGet package repository
To instal from NuGet, run the following command in your instance of Visual Studio.

    PM> Install-Package MrNPicker 

#### Manual installation
Just download and add the package to your `App_Plugins` folder. When you upen your instance of Umbraco you will be able to create a new data type based on Mr N Picker.

### Using Mr N Picker
Using Mr N Picker is simple. Set up a new data type and select the `Mayfly.MrNPicker` type from within Umbraco's Developer section. After your selection, you will be presentated with the following options for your data type, which are as follows:

* **Root nodes:** A MNTP that allows you to select one or more roots for your multi-root node picker.
* **XPath:** A collection of XPath expressions to select a number of roots
* **Allow items of type:** A comma-delimited list of document type aliases to filter the resulting node tree
* **Minimum number of items:** The minimum number of items the editor can add to a multi-root node picker. This can be left empty if no minimum constraints are required
* **Maximum number of items:** The maximum number of items the editor can add to a multi-root node picker. This can be left empty if no maximum constraints are required
* **Merge roots:** Merges the roots in the rendered tree if a selected root is the child of another selected root. This avoids duplication in the tree.

Once this data type is set up, you will be able to add the data type as a property to a document type. When an instance of that document type is created/accessed, the editor will see the resulting multi-root node picker with their rendered tree.

### Contribution guidelines
To raise a new bug, create an issue on the GitHub repository. To fix a bug or add new features, fork the repository and send a pull request with your changes. Feel free to add ideas to the repository's issues list if you would to discuss anything related to the package.

### Who do I talk to?
This project is maintained by [Mayfly Media](http://www.mayflymedia.co.uk). If you have any questions about this project please contact us through the Mr N Picker forum on Our Umbraco, or by raising an issue on GitHub.

### Many thanks
* [Callum Whyte](https://twitter.com/callumbwhyte/)
* Dean Evans
* [Emma Garland](https://twitter.com/emmagarland/)
* [James Patterson](https://twitter.com/jamesrpatterson/)
* Joshua Richards
* [Mike Bull](https://twitter.com/mikebull/)
* Simon Hartfield
* Tom Barklamb

Additional thanks to Janusz Stabik and Declan Burns for providing the necessary time and resources for the Mayfly team to work on this project.

## License
Copyright &copy; 2015 [Mayfly Media Ltd](http://www.mayflymedia.co.uk), and other contributors

Licensed under the MIT License.
