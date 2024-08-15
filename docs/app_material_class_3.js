importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/wheels/bokeh-3.4.3-py3-none-any.whl', 'https://cdn.holoviz.org/panel/1.4.5/dist/wheels/panel-1.4.5-py3-none-any.whl', 'pyodide-http==0.2.1', 'hvplot', 'numpy', 'pandas', 'requests']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  \nimport asyncio\n\nfrom panel.io.pyodide import init_doc, write_doc\n\ninit_doc()\n\nfrom functools import partial\nfrom io import StringIO\n\nimport hvplot.pandas\nimport numpy as np\nimport pandas as pd\nimport panel as pn\nimport requests\nfrom bokeh.models import HoverTool, HTMLTemplateFormatter\n\n# CONSTANTS (settings)\nTITLE = "Database-Name: Material class 3 explorer"\nDATA_PATH = (\n    "https://raw.githubusercontent.com/paolodeangelis/temp_panel/main/data/mclass3.json"\n)\nBIB_FILE = "https://raw.githubusercontent.com/paolodeangelis/temp_panel/main/assets/gnome-energy.bib"\nRIS_FILE = "https://raw.githubusercontent.com/paolodeangelis/temp_panel/main/assets/gnome-energy.ris"\nACCENT = "#e64570"\nPALETTE = [\n    "#50c4d3",\n    "#efa04b",\n    "#f16c90",\n    "#426ba2",\n    "#d7fbc0",\n    "#ffd29b",\n    "#fe8580",\n    "#009b8f",\n    "#73bced",\n]\nWORKING_IONS = ["A", "B", "C", "D", "E", "F"]\nWORKING_IONS_ACTIVE = ["A", "B", "C"]\nCATEGORY = "Category 1"\nCATEGORY_ACTIVE = WORKING_IONS_ACTIVE\nCOLUMNS = [\n    "ID",\n    "Category 1",\n    "Property 1",\n    "Property 2",\n    "Property 3",\n    "Property 4",\n    "Property 5",\n    "Property 6",\n    "Property 7",\n    "Property 8",\n    "Ranking",\n    "File",\n]\nCOLUMNS_ACTIVE = [\n    "ID",\n    "Category 1",\n    "Property 1",\n    "Property 2",\n    "Property 3",\n    "Property 4",\n    "File",\n]\nN_ROW = 12\nSIDEBAR_W = 380\nSIDEBAR_WIDGET_W = 320\nPLOT_SIZE = [900, 500]  # WxH\nTABLE_FORMATTER = {\n    "File": HTMLTemplateFormatter(\n        template=r'<code><a href="https://raw.githubusercontent.com/paolodeangelis/temp_panel/main/data/cif/test1.cif?download=1" download="<%= value %>.cif" target="_blank"> <i class="fas fa-external-link-alt"></i> <%= value %>.cif </a></code>'  # noqa: E501\n    )\n    # HTMLTemplateFormatter(template=r'<code><a href="file:///C:/Users/Paolo/OneDrive%20-%20Politecnico%20di%20Torino/3-Articoli/2024-GNoME/plots/<%= value %>.cif?download=1" download="realname.cif" > <%= value %>.cif </a></code>') # noqa: E501\n}\nABOUT_W = 500\nABOUT_MSG = """\n# About\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\nProin id porttitor dui. In neque lectus, malesuada sed arcu vitae, cursus tincidunt nisl. Etiam lacinia congue porttitor. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec mollis id justo eu mattis. Duis quis vulputate massa. Morbi est tortor, fermentum in neque non, aliquet suscipit justo. Sed sed odio efficitur, viverra ante fermentum, pulvinar ex. Sed id bibendum elit, faucibus convallis dui. Donec eu pulvinar orci.\nNullam et libero vitae orci molestie gravida at nec risus. Nam ipsum sapien, lacinia molestie nulla quis, ornare laoreet velit. Maecenas nec volutpat nulla. Ut erat ipsum, porttitor vel bibendum in, volutpat in ex. Vestibulum vel odio orci.\nProin eget turpis et erat faucibus feugiat non vel nisi. Ut sed erat sed ligula cursus bibendum. Proin ultricies accumsan diam, vitae fermentum nulla commodo in. Nulla vehicula odio sit amet dictum tristique. Phasellus non posuere mi, vel vehicula neque. Donec leo turpis, iaculis vel enim eget, convallis elementum mi. Donec euismod mattis orci et interdum.\n\nIf you find this dataset valuable, please consider citing the original work:\n\n> De Angelis, Paolo, et al. "Article Title to be defiened" *Journal*.\n\n"""\nFOOTER = f"""\n<link rel="stylesheet"\nhref="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css" />\n\n<footer style="color: #777; padding: 0px; text-align: center;\nline-height: 1.0; width: 100%; margin-left: auto; margin-right: auto;">\n    <p style="font-size: 1.2em; margin-top: 0px; margin-bottom: 0.2em;">\n        <a href="https://paolodeangelis.github.io/" style="color: #777;\n        text-decoration: none;" target="_blank" >\n            <i class="ti ti-code"\n            style="vertical-align: middle; font-size: 1.25em;"></i>\n            with\n            <i class="ti ti-heart-filled"\n            style="vertical-align: middle; font-size: 1.25em;"></i>\n            by <strong style="color: #555"\n            onmouseover="this.style.color='{ACCENT}'"\n            onmouseout="this.style.color='#555'">\n            Paolo De Angelis\n            </strong>\n        </a>\n    </p>\n    <p style="font-size: 0.85em; margin-top: 0px">\n        Made entirely with OSS packages:\n        <a href="https://panel.holoviz.org/"\n        style="color: #555; text-decoration: none;"\n        target="_blank"\n        onmouseover="this.style.color='{ACCENT}'"\n        onmouseout="this.style.color='#555'">\n        <strong>Panel</strong>\n        </a>,\n        <a href="https://holoviews.org/"\n        style="color: #555; text-decoration: none;"\n        target="_blank" onmouseover="this.style.color='{ACCENT}'"\n        onmouseout="this.style.color='#555'">\n        <strong>Holoviews</strong>\n        </a>,\n        <a href="https://bokeh.org/"\n        style="color: #555; text-decoration: none;"\n        target="_blank"\n        onmouseover="this.style.color='{ACCENT}'"\n        onmouseout="this.style.color='#555'">\n        <strong>Bokeh</strong>\n        </a>,\n        <a href="https://pandas.pydata.org/"\n        style="color: #555; text-decoration: none;" target="_blank"\n        onmouseover="this.style.color='{ACCENT}'"\n        onmouseout="this.style.color='#555'">\n        <strong>Pandas</strong>\n        </a>,\n        <a href="https://numpy.org/"\n        style="color: #555; text-decoration: none;" target="_blank"\n        onmouseover="this.style.color='{ACCENT}'"\n        onmouseout="this.style.color='#555'">\n        <strong>Numpy</strong>\n        </a>.\n    </p>\n\n</footer>\n"""\n\n# Database\nglobal df\n\n\n@pn.cache\ndef initialize_data() -> pd.DataFrame:\n    """\n    Load and initialize the dataset by setting up default columns and values.\n\n    This function loads the dataset from a JSON file, initializes a 'Ranking' column\n    with default values of 1, and creates a 'File' column based on the 'ID' column.\n\n    Returns:\n        pd.DataFrame: The initialized DataFrame with additional columns.\n    """\n    # Load the dataset\n    df = pd.read_json(DATA_PATH)\n    # Initialize the 'Ranking' column with default value of 1\n    df["Ranking"] = 1.0  # Vectorized assignment is more efficient\n    # Create a 'File' column based on the 'ID' column\n    df["File"] = df["ID"]\n    return df\n\n\ndf = initialize_data()\n\n\nglobal table\ntable = pn.widgets.Tabulator(\n    df,\n    pagination="remote",\n    page_size=N_ROW,\n    sizing_mode="stretch_width",\n    formatters=TABLE_FORMATTER,\n)\n\nglobal all_columns\nall_columns = df.columns.unique()\n\nglobal all_ions\nall_ions = WORKING_IONS  # df[CATEGORY].unique()\n\n\n# Functions\ndef get_raw_file_github(url: str) -> StringIO:\n    """\n    Fetches the raw content of a file from a given GitHub URL and returns it as a StringIO object.\n\n    Args:\n        url (str): The URL of the raw file on GitHub.\n\n    Returns:\n        StringIO: A StringIO object containing the content of the file.\n\n    Raises:\n        requests.HTTPError: If the HTTP request returned an unsuccessful status code.\n    """\n    try:\n        response = requests.get(url)\n        response.raise_for_status()  # Raise an exception for HTTP errors\n        output = StringIO(\n            response.text\n        )  # Use response.text to directly decode and write to StringIO\n        return output\n    except requests.HTTPError as http_err:\n        print(f"HTTP error occurred: {http_err}")\n        raise http_err  # Re-raise the exception after logging it\n    except Exception as err:\n        print(f"An error occurred: {err}")\n        raise err  # Re-raise the exception after logging it\n    finally:\n        response.close()  # Ensure the response is always closed properly\n\n\ndef apply_range_filter(\n    df: pd.DataFrame, column: str, value_range: pn.widgets.RangeSlider\n) -> pd.DataFrame:\n    """\n    Apply a range filter to a specified column in the DataFrame.\n\n    Args:\n        df (pd.DataFrame): The DataFrame containing the data to filter.\n        column (str): The column name on which to apply the filter.\n        value_range (pn.widgets.RangeSlider): A Panel RangeSlider widget or a tuple indicating the range values.\n\n    Returns:\n        pd.DataFrame: The filtered DataFrame containing rows within the specified range.\n    """\n    start, end = value_range if isinstance(value_range, tuple) else value_range.value\n    return df[(df[column] >= start) & (df[column] <= end)]\n\n\ndef apply_category_filter(\n    df: pd.DataFrame, category: str, item_to_hide: str\n) -> pd.DataFrame:\n    """\n    Filter out rows from the DataFrame where the specified category column matches the item to hide.\n\n    Args:\n        df (pd.DataFrame): The DataFrame to filter.\n        category (str): The column name in the DataFrame to apply the filter on.\n        item_to_hide (str): The value in the category column that should be excluded from the result.\n\n    Returns:\n        pd.DataFrame: A DataFrame with rows where the category column does not match the item_to_hide.\n    """\n    if category not in df.columns:\n        raise ValueError(f"Column '{category}' not found in DataFrame.")\n\n    return df[df[category] != item_to_hide]\n\n\ndef create_range_slider(col: str, name: str = "filter") -> pn.widgets.RangeSlider:\n    """\n    Create a RangeSlider widget for filtering a DataFrame column.\n\n    Args:\n        col (str): The name of the column to apply the RangeSlider on.\n        name (str, optional): The name of the slider widget. Defaults to 'filter'.\n\n    Returns:\n        pn.widgets.RangeSlider: A RangeSlider widget initialized with the column's value range.\n    """\n    slider = pn.widgets.RangeSlider(\n        start=table.value[col].min(),\n        end=table.value[col].max(),\n        name=name,\n        sizing_mode="fixed",\n        width=SIDEBAR_WIDGET_W,\n    )\n    return slider\n\n\ndef min_max_norm(v: pd.Series) -> pd.Series:\n    """\n    Normalize a Pandas Series using min-max normalization.\n\n    Args:\n        v (pd.Series): The Series to be normalized.\n\n    Returns:\n        pd.Series: The min-max normalized Series, where values are scaled to the range [0, 1].\n    """\n    v_min = v.min()\n    v_max = v.max()\n    if v_min == v_max:\n        return pd.Series(\n            np.zeros(len(v)), index=v.index\n        )  # Return a Series of zeros if all values are the same\n    return (v - v_min) / (v_max - v_min)\n\n\ndef show_selected_columns(\n    table: pn.widgets.Tabulator, columns: list\n) -> pn.widgets.Tabulator:\n    """\n    Update the table widget to display only the selected columns by hiding the others.\n\n    Args:\n        table (pn.widgets.Tabulator): The table widget.\n        columns (list): A list of column names to be displayed.\n\n    Returns:\n        pn.widgets.Tabulator: The updated table widget with only the selected columns visible.\n    """\n    hidden_columns = set(all_columns) - set(columns)\n    table.hidden_columns = list(hidden_columns)\n    return table\n\n\ndef build_interactive_table(\n    # weights\n    w_property1: pn.widgets.IntSlider,\n    w_property2: pn.widgets.IntSlider,\n    w_property3: pn.widgets.IntSlider,\n    w_property4: pn.widgets.IntSlider,\n    w_property5: pn.widgets.IntSlider,\n    w_property6: pn.widgets.IntSlider,\n    w_property7: pn.widgets.IntSlider,\n    w_property8: pn.widgets.IntSlider,\n    # sliders\n    # s_classifier_mean: pn.widgets.RangeSlider,\n    columns: list,\n    sliders: dict = None,\n    categories: list = None,\n) -> pn.Column:\n    """\n    Build an interactive table with ranking and filtering features based on the provided weights and filters.\n\n    Args:\n        w_property1 to w_property8: IntSlider widgets representing weights for each property.\n        columns (list): A list of column names to be displayed in the table.\n        sliders (dict, optional): A dictionary where keys are column names and values are RangeSlider widgets for filtering. Defaults to None.\n        categories (list, optional): A list of categories to be displayed. Defaults to None.\n\n    Returns:\n        pn.Column: A Panel Column containing the filename input, download button, and the interactive table.\n    """\n    # Calculate ranking based on weights and normalize\n    ranking = (\n        w_property1 * min_max_norm(df["Property 1"])\n        + w_property2 * min_max_norm(df["Property 2"])\n        + w_property3 * min_max_norm(df["Property 3"])\n        + w_property4 * min_max_norm(df["Property 4"])\n        + w_property5 * min_max_norm(df["Property 5"])\n        + w_property6 * min_max_norm(df["Property 6"])\n        + w_property7 * min_max_norm(df["Property 7"])\n        + w_property8 * min_max_norm(df["Property 8"])\n    )\n    # Add the ranking to the DataFrame and normalize\n    df["Ranking"] = min_max_norm(ranking)\n    # Sort DataFrame by Ranking\n    df.sort_values(by="Ranking", ascending=False, inplace=True, ignore_index=True)\n    # Create a Tabulator widget with the sorted DataFrame\n    table = pn.widgets.Tabulator(\n        df,\n        pagination="remote",\n        page_size=N_ROW,\n        sizing_mode="stretch_width",\n        formatters=TABLE_FORMATTER,\n    )\n    # Show selected columns\n    table = show_selected_columns(table, columns)\n    # Apply range filters using sliders\n    # table.add_filter(pn.bind(apply_range_filter, column="classifier_mean", value_range=s_classifier_mean))\n    if sliders:\n        for column, slider in sliders.items():\n            if column in df.columns:  # Ensure the column exists in the DataFrame\n                table.add_filter(\n                    pn.bind(apply_range_filter, column=column, value_range=slider)\n                )\n    # Apply category filters for categories\n    if categories:\n        hidden_ions = set(all_ions) - set(categories)\n        for ion in hidden_ions:\n            table.add_filter(\n                pn.bind(apply_category_filter, category=CATEGORY, item_to_hide=ion)\n            )\n    # Add download section\n    filename, button = table.download_menu(\n        text_kwargs={"name": "Enter filename", "value": "cathode_candidates.csv"},\n        button_kwargs={"name": "Download table"},\n    )\n    return pn.Column(filename, button, table)\n\n\nhover = HoverTool(\n    tooltips=[\n        ("ID", "@{ID}"),\n        ("Category 1", "@{Category 1}"),\n        ("Property 1", "@{Property 1}{0.2f}"),\n        ("Property 2", "@{Property 2}{0.2f}"),\n        ("Property 3", "@{Property 3}{0.2f}"),\n    ],\n)\n\n\ndef build_interactive_plot(\n    s_property1: pn.widgets.RangeSlider,\n    s_property2: pn.widgets.RangeSlider,\n    s_property3: pn.widgets.RangeSlider,\n    s_property4: pn.widgets.RangeSlider,\n    s_property5: pn.widgets.RangeSlider,\n    s_property6: pn.widgets.RangeSlider,\n    s_property7: pn.widgets.RangeSlider,\n    s_property8: pn.widgets.RangeSlider,\n    categories: list = None,\n) -> hvplot:\n    """\n    Builds an interactive scatter plot based on selected filters and ion selection.\n\n    Args:\n        s_property1 (pn.widgets.RangeSlider): Property 1 filter.\n        s_property2 (pn.widgets.RangeSlider): Property 2 filter.\n        s_property3 (pn.widgets.RangeSlider): Property 3 filter.\n        s_property4 (pn.widgets.RangeSlider): Property 4 filter.\n        s_property5 (pn.widgets.RangeSlider): Property 5 filter.\n        s_property6 (pn.widgets.RangeSlider): Property 6 filter.\n        s_property7 (pn.widgets.RangeSlider): Property 7 filter.\n        s_property8 (pn.widgets.RangeSlider): Property 8 filter.\n        categories (list, optional): List of categories to include in the plot. Default is None.\n\n    Returns:\n        hvplot: An interactive scatter plot with applied filters.\n    """\n    plot_df = df.copy()\n\n    # Apply filters based on sliders\n    filters = [\n        ("Property 1", s_property1),\n        ("Property 2", s_property2),\n        ("Property 3", s_property3),\n        ("Property 4", s_property4),\n        ("Property 5", s_property5),\n        ("Property 6", s_property6),\n        ("Property 7", s_property7),\n        ("Property 8", s_property8),\n    ]\n\n    for col, slider in filters:\n        plot_df = plot_df[(plot_df[col] >= slider[0]) & (plot_df[col] <= slider[1])]\n\n    # Apply ion filter if provided\n    if categories:\n        plot_df = plot_df[plot_df[CATEGORY].isin(categories)]\n\n    # Background scatter plot with all data\n    back_scatter = df.hvplot.scatter(\n        x="Property 2",\n        y="Property 3",\n        s=100,\n        alpha=0.25,\n        color="#444",\n        line_color="white",\n        hover_cols="all",\n    ).opts(\n        tools=[],\n        logx=False,\n        logy=True,\n        xlabel="Property 2 (-)",\n        ylabel="Property 3 (-)",\n    )\n\n    # Foreground scatter plot with filtered data\n    front_scatter = plot_df.hvplot.scatter(\n        x="Property 2",\n        y="Property 3",\n        s=100,\n        # noqa:E501 hover_cols=['ID', 'Category 1', 'Property 1', 'Property 2', 'Property 3', 'Property 4', 'File'],  hover_cols='all',\n        line_color="white",\n        c=CATEGORY,\n        legend="top",\n        hover_cols="all",\n    ).opts(\n        logx=False,\n        logy=True,\n        xlabel="Property 2 (-)",\n        ylabel="Property 3 (-)",\n        cmap=PALETTE,\n        tools=[hover],\n    )\n\n    # Combine background and foreground scatter plots\n    scatter = back_scatter * front_scatter\n    scatter.opts(\n        min_width=PLOT_SIZE[0],\n        height=PLOT_SIZE[1],\n        show_grid=True,\n    )\n\n    return scatter\n\n\n# (1) Widget SIDEBAR : properties weights\nweights = {}\nweights_helper = {}\n# Property 1\nw_property1 = pn.widgets.IntSlider(\n    name="Property 1",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property1_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 1' property in the <b><i>ranking function</i></b>."\n)\n# Property 2\nw_property2 = pn.widgets.IntSlider(\n    name="Property 2",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property2_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 2' property in the <b><i>ranking function</i></b>."\n)\nweights["Property 2"] = w_property2\nweights_helper["Property 2"] = w_property2_help\n# Property 3\nw_property3 = pn.widgets.IntSlider(\n    name="Property 3",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property3_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 3' property in the <b><i>ranking function</i></b>."\n)\nweights["Property 3"] = w_property3\nweights_helper["Property 3"] = w_property3_help\n# Property 4\nw_property4 = pn.widgets.IntSlider(\n    name="Property 4",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property4_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 4' property in the <b><i>ranking function</i></b>."\n)\nweights["Property 4"] = w_property4\nweights_helper["Property 4"] = w_property4_help\n# Property 5\nw_property5 = pn.widgets.IntSlider(\n    name="Property 5",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property5_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 5' property in the <b><i>ranking function</i></b>."\n)\nweights["Property 5"] = w_property5\nweights_helper["Property 5"] = w_property5_help\n# Property 6\nw_property6 = pn.widgets.IntSlider(\n    name="Property 6",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property6_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 6' property in the <b><i>ranking function</i></b>."\n)\nweights["Property 6"] = w_property6\nweights_helper["Property 6"] = w_property6_help\n# Property 7\nw_property7 = pn.widgets.IntSlider(\n    name="Property 7",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property7_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 7' property in the <b><i>ranking function</i></b>."\n)\nweights["Property 7"] = w_property7\nweights_helper["Property 7"] = w_property7_help\n# Property 8\nw_property8 = pn.widgets.IntSlider(\n    name="Property 8",\n    start=-10,\n    end=10,\n    step=1,\n    value=1,\n    sizing_mode="fixed",\n    width=SIDEBAR_WIDGET_W,\n)\nw_property8_help = pn.widgets.TooltipIcon(\n    value="Adjust the weight of the 'Property 8' property in the <b><i>ranking function</i></b>."\n)\nweights["Property 8"] = w_property8\nweights_helper["Property 8"] = w_property8_help\n\n# (2) Widget SIDEBAR : properties range\nsliders = {}\nsliders_helper = {}\n# Property 1\ns_property1 = create_range_slider("Property 1", "Property 1 (-)")\ns_property1_help = pn.widgets.TooltipIcon(value="<b>Property 1 (-)</b> description...")\nsliders["Property 1"] = s_property1\nsliders_helper["Property 1"] = s_property1_help\n# Property 2\ns_property2 = create_range_slider("Property 2", "Property 2 (-)")\ns_property2_help = pn.widgets.TooltipIcon(value="<b>Property 2 (-)</b> description...")\nsliders["Property 2"] = s_property2\nsliders_helper["Property 2"] = s_property2_help\n# Property 3\ns_property3 = create_range_slider("Property 3", "Property 3 (-)")\ns_property3_help = pn.widgets.TooltipIcon(value="<b>Property 3 (-)</b> description...")\nsliders["Property 3"] = s_property3\nsliders_helper["Property 3"] = s_property3_help\n# Property 4\ns_property4 = create_range_slider("Property 4", "Property 4 (-)")\ns_property4_help = pn.widgets.TooltipIcon(value="<b>Property 4 (-)</b> description...")\nsliders["Property 4"] = s_property4\nsliders_helper["Property 4"] = s_property4_help\n# Property 5\ns_property5 = create_range_slider("Property 5", "Property 5 (-)")\ns_property5_help = pn.widgets.TooltipIcon(value="<b>Property 5 (-)</b> description...")\nsliders["Property 5"] = s_property5\nsliders_helper["Property 5"] = s_property5_help\n# Property 6\ns_property6 = create_range_slider("Property 6", "Property 6 (-)")\ns_property6_help = pn.widgets.TooltipIcon(value="<b>Property 6 (-)</b> description...")\nsliders["Property 6"] = s_property6\nsliders_helper["Property 6"] = s_property6_help\n# Property 7\ns_property7 = create_range_slider("Property 7", "Property 7 (-)")\ns_property7_help = pn.widgets.TooltipIcon(value="<b>Property 7 (-)</b> description...")\nsliders["Property 7"] = s_property7\nsliders_helper["Property 7"] = s_property7_help\n# Property 8\ns_property8 = create_range_slider("Property 8", "Property 8 (-)")\ns_property8_help = pn.widgets.TooltipIcon(value="<b>Property 8 (-)</b> description...")\nsliders["Property 8"] = s_property8\nsliders_helper["Property 8"] = s_property8_help\n\n# (3) Widget SIDEBAR: Ions selection\nselect_ions = pn.widgets.MultiChoice(\n    value=WORKING_IONS_ACTIVE,\n    options=WORKING_IONS,\n    #  sizing_mode='stretch_width',\n    width=SIDEBAR_WIDGET_W,\n    sizing_mode="fixed",\n    description="Add or remove <i>cathodes</i> with a specific <i>active ion material</i>",\n)\n\n\n# (1) Widget MAIN: Table properties\nselect_properties = pn.widgets.MultiChoice(\n    name="Database Properties",\n    value=COLUMNS_ACTIVE,\n    options=COLUMNS,\n    sizing_mode="stretch_width",\n)\n\n# (2) Widget MAIN: Table\neditors = {key: {"disabled": True} for key in df}\ndownloadable_table = pn.bind(\n    build_interactive_table,\n    # weights\n    w_property1=w_property1,\n    w_property2=w_property2,\n    w_property3=w_property3,\n    w_property4=w_property4,\n    w_property5=w_property5,\n    w_property6=w_property6,\n    w_property7=w_property7,\n    w_property8=w_property8,\n    # sliders\n    # s_classifier_mean=s_classifier_mean,\n    columns=select_properties,\n    categories=select_ions,\n    sliders=sliders,\n)\n\n# (3) Widget MAIN: Plot\nplot = pn.bind(\n    build_interactive_plot,\n    s_property1=s_property1,\n    s_property2=s_property2,\n    s_property3=s_property3,\n    s_property4=s_property4,\n    s_property5=s_property5,\n    s_property6=s_property6,\n    s_property7=s_property7,\n    s_property8=s_property8,\n    categories=select_ions,\n)\n\n# Widget MAIN: Text\ntext_info = pn.pane.Markdown(ABOUT_MSG, width=ABOUT_W)\ndownload_bibtex = pn.widgets.FileDownload(\n    icon="download",\n    label="Download BibTeX ",\n    button_type="primary",\n    filename="reference.bib",\n    callback=partial(get_raw_file_github, BIB_FILE),\n    embed=True,\n)\ndownload_ris = pn.widgets.FileDownload(\n    icon="download",\n    label="Download RIS ",\n    button_type="primary",\n    filename="reference.ris",\n    callback=partial(get_raw_file_github, RIS_FILE),\n    embed=True,\n)\n\nabout_box = pn.Column(text_info, pn.Row(download_bibtex, download_ris))\n\n# Layout\nweights_col = pn.Column()\nfor key in weights.keys():\n    weights_col.append(pn.Row(weights[key], weights_helper[key]))\n\nsliders_col = pn.Column()\nfor key in sliders.keys():\n    sliders_col.append(pn.Row(sliders[key], sliders_helper[key]))\n\ncontrols_tabs_intro = pn.pane.Markdown(\n    """\n<style>\np, h1, h2, h3 {\n    margin-block-start: 0.2em;\n    margin-block-end: 0.2em;\n}\nul {\n    margin-block-start: 0.3em;\n    margin-block-end: 0.3em;\n}\n</style>\n## Control panel\nThe control panel below has two tabs:\n* **Properties**: Allows you to filter the database by controlling the ranges of different properties.\n* **Ranking**: Allows you to control the ranking score by adjusting the weights applied to different min-max normalized properties.""",\n    # styles={'margin-block-start': "0.5em"},\n)\n\ncontrols_tabs = pn.Tabs(("Properties", sliders_col), ("Ranking", weights_col))\n\nbox_select_ions = pn.Column(\n    pn.Row(\n        pn.pane.Markdown(\n            """\n<style>\np, h1, h2, h3 {\n    margin-block-start: 0.2em;\n    margin-block-end: 0.2em;\n}\nul {\n    margin-block-start: 0.3em;\n    margin-block-end: 0.3em;\n}\n</style>\n## Working categories\nAdd or remove rows belloging to specific category"""\n        ),\n        #    pn.widgets.TooltipIcon(\n        #        value="Add or remove <i>cathodes</i> with a specific <i>active ion material</i>"\n        #        )\n    ),\n    select_ions,\n)\n\ndivider_sb = pn.layout.Divider(margin=(-5, 0, -5, 0))\ndivider_m = pn.layout.Divider()\nfooter = pn.pane.HTML(FOOTER, sizing_mode="stretch_width")\npn.template.FastListTemplate(\n    title=TITLE,\n    sidebar=[box_select_ions, divider_sb, controls_tabs_intro, controls_tabs],\n    main=[\n        pn.Row(plot, about_box),\n        pn.Column(select_properties, downloadable_table),\n        divider_m,\n        footer,\n    ],\n    sidebar_width=SIDEBAR_W,\n    # header_background = "CadetBlue",\n    main_layout=None,\n    accent=ACCENT,\n).servable()\n\n\nawait write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.globals.set('patch', msg.patch)
    self.pyodide.runPythonAsync(`
    from panel.io.pyodide import _convert_json_patch
    state.curdoc.apply_json_patch(_convert_json_patch(patch), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.globals.set('location', msg.location)
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads(location)
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()
