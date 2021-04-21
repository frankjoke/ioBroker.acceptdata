function config() {
  /* jshint strict: false */
  // config file to include:
  // iconName string for the adapter-icon
  // configTool [] for the array of pages/Tabs
  // translations object with translation keys/languages of text to be translated from configTool
  return {
    iconName: "acceptdata.png",
    encryptedFields: ["password"],
    configTool_test: [
      {
        icon: "settings",
        spacing: 1,
        items: [
          {
            itype: "$icon",
            icon: "translate",
            size: "large",
            color: "error",
            onClick:
              "{Iob.logSnackbar('info;!copyToClipboard {0}', Iob.copyToClipboard(Iob.notFoundI18n));}",
            noGrid: true,
          },
        ],
      },
    ],
    configTool: [
      {
        icon: "settings",
        tooltip: "Basic adapter config",
        label: "config",
        spacing: 1,
        items: [
          {
            label: "Port",
            itype: "$number",
            min: 1000,
            max: 65000,
            defaultValue: 3000,
            placeholder: "Enter port address on to listen on, 3000=example",
            hint: "Port to listen on >=1000 & <=65000",
            field: "port",
            fullWidth: true,
            prependIcon: "exit_to_app",
            cols: 3,
            sm: 4,
          },
          {
            label: "For Method field:",
            itype: "$html",
            text: [
              "!<code>GET</code> | <code>POST</code> ",
              "is supported.",
              "!<br>",
              "By entering the below URL in your browser (changing iobroker-server to your server name or ip) you can test the 'Test' entry:",
              "!<br><a target='_blank' rel='noopener noreferrer' href='http://MyHost:MyPort/Test?what=ok&length_$m=12&temp_$%C2%B0F=13&speed_$mp/h=88'>http://MyHost:MyPort/Test?what=ok&length_$m=12&temp_$%C2%B0F=13&speed_$mp/h=88</a>",
            ],
            style: {
              width: "98%",
            },
            changeItems: [
              "{items.text = items.text.map(i => i.replace(/MyHost/g,Iob.getStore.location.hostname))}",
              "{items.text = items.text.map(i => i.replace(/MyPort/g,Iob.getStore.inative.port))}",
            ],
            cols: 6,
            sm: 8,
          },
          {
            label: "For Path field:",
            itype: "$html",
            text: [
              "The external device can connect to the adapter's server using following example:",
              "!<br>`http://MyHost:MyPort/&nbsp;<code>path</code>&nbsp;?data=...`",
            ],
            changeItems:
              "{items.text = items.text.map(i => i.replace(/MyPort/g,Iob.getStore.inative.port))}",
            style: {
              width: "98%",
            },
            cols: 3,
            sm: 4,
          },
          {
            label: "For Convert field:",
            itype: "$html",
            text: [
              "Conversion receives data as variable $ and can convert it to some new format which will then be stored in state(s) named with path. ",
              "!<br>",
              "Example: ",
              "!<code>{ tempC: FtoC($.tempf, 1) }</code>",
              " where 'FtoC' is an internal conversion for Farenheit to Celsius. Other functions are",
              "!<br><code>toNum(str, digits_after_comma), CtoF(..) and ItoMM(...)</code>",
              "The field names can end with '_' and type/unit information. The text after the '_' will be the type like with '_date',",
              "or if type should be number with specific unit you can name it '_$km/h'.",
              "There are some predefined types available as well which can be named directly (without $):",
              "!<br><code>'Hum', 'Kmh', 'Deg', 'Date', 'Hpa', 'Mm', 'Wm2', 'Txt', 'C', 'N'</code>",
              "where N is just a number Value, the many of the other set also roles.",
            ],
            style: {
              width: "98%",
            },
            cols: 9,
            sm: 8,
          },
          {
            label: "Path Table",
            itype: "$table",
            field: "pathtable",
            "disable-sort": true,
            cols: 12,
            items: [
              {
                headerName: "Name",
                itype: "$string",
                field: "name",
                align: "left",
                rules: ["uniqueTableRule", "onlyWords"],
                sortable: true,
                defaultValue: "newPath",
                width: "10%",
              },
              {
                headerName: "Method / Source / Path / InputConversion",
                itype: "$ilist",
                size: "small",
                sortable: false,
                width: "12%",
                align: "left",
                sortable: false,
                items: [
                  {
                    itype: "$select",
                    tooltip: "please select method",
                    iselect: ($, props, Iob) => {
                      const sel = Iob.getState(".info.plugins.$methods");
                      let res = (sel && sel.val) || [];
                      return res;
                    },
                    field: "method",
                    defaultValue: "none",
                    fullWidth: false,
                    width: "150px",
                  },
                  {
                    itype: "$select",
                    tooltip: "please select method",
                    iselect: ($, props, Iob) => {
                      const sel = Iob.getState(".info.plugins.$inputtypes");
                      let res = (sel && sel.val) || [];
//                      console.log(sel, res);
                      return res;
                    },
                    hideItem: (props, Iob) => {
                      const sel = Iob.getState(".info.plugins.$methods");
                      let res = (sel && sel.val) || [];
                      const method = props.inative["method"];
                      const f = res.find((i) => i.value == method);
//                      console.log(res, method, f);
                      return !f || (f && !f.iconv);
                    },
                    field: "iconv",
                    defaultValue: "",
                    fullWidth: false,
                    width: "100px",
                    spaces: 2,
                  },
                  {
                    itype: "$textarea",
                    cols: 40,
                    placeholder: "read source path or options",
                    field: "path",
                    rowsMin: "1",
                    lineBreak: true,
                  },
                  {
                    itype: "$textarea",
                    placeholder: "enter here write command",
                    field: "write",
                    cols: 40,
                    rowsMin: "1",
                    lineBreak: true,
                    hideItem: (props, Iob) => {
                      const sel = Iob.getState(".info.plugins.$methods");
                      let res = (sel && sel.val) || [];
                      const method = props.inative["method"];
                      const f = res.find((i) => i.value == method);
                      //                  console.log(res, method);
                      return !f || (f && !f.write);
                    },
                  },
                ],
              },
              {
                headerName: "Schedule",
                itype: "$string",
                field: "schedule",
                align: "left",
                disabled: (props, Iob) => {
                  const sel = Iob.getState(".info.plugins.$methods");
                  let res = (sel && sel.val) || [];
                  const method = props.inative["method"];
                  const f = res.find((i) => i.value == method);
                  //                  console.log(res, method);
                  return !f || (f && !f.hasSchedule);
                },
                //                rowsMin: "1",
                //                rules: ["onlyWords"],
                //                sortable: true,
                //                defaultValue: "newPath",
                width: "10%",
              },
              {
                headerName: "Converter",
                itype: "$ilist",
                sortable: false,
                width: "10%",
                align: "left",
                sortable: false,
                items: [
                  {
                    itype: "$select",
                    tooltip: "please select a converter",
                    iselect: ($, props, Iob) => {
                      const sel = Iob.getState(".info.plugins.$converters");
                      let res = (sel && sel.val) || [];
                      return res;
                    },
                    field: "converter",
                    fullWidth: false,
                    defaultValue: "none",
                    width: "200px",
                  },
                  {
                    field: "convert",
                    itype: "$textarea",
                    cols: 40,
                    rowsMin: "1",
                    defaultValue: "$",
                    lineBreak: true,
                    placeholder:
                      "Please enter the converter formula or options, '$' is the simplest!",
                    hideItem: (props, Iob) => {
                      const sel = Iob.getState(".info.plugins.$converters");
                      let res = (sel && sel.val) || [];
                      const method = props.inative["converter"] || "none";
                      const f = res.find((i) => i.value == method);
                      //                      console.log(res, method, f);
                      return !f || (f && !f.options);
                    },
                  },
                ],
              },
              {
                headerName: "Enabled",
                itype: "$checkbox",
                field: "enabled",
                sortable: false,
                align: "center",
                width: "5%",
              },
            ],
          },
          {
            itype: "$log",
            pageSize: 10,
            cols: 12,
          },
        ],
      },
      {
        label: "Scenes",
        icon: "playlist_add",
        tooltip: "Create and manage scenes or special actions",
        spacing: 1,
        items: [
          {
            itype: "$stateBrowser",
            pageSize: 25,
            dragZone: "adapterState",
            cols: 6,
          },
          {
            itype: "$grid",
            spacing: 1,
            cols: 6,
            items: [
              {
                label: "Scene setup",
                itype: "$table",
                field: "scenes",
                "dyisable-sort": true,
                cols: 12,
                items: [
                  {
                    headerName: "Name",
                    itype: "$string",
                    tooltip: "name of combined state",
                    field: "name",
                    align: "left",
                    rules: ["uniqueTableRule", "onlyWords"],
                    sortable: true,
                    defaultValue: "newName",
                    width: "20%",
                  },
                  {
                    headerName: "Scene",
                    itype: "$chips",
                    tooltip: "sequence of commands, number=delay",
                    field: "scene",
                    align: "left",
                    clickable: true,
                    sortable: false,
                    width: "75%",
                    iselect: ($, props, Iob) => Object.keys(Iob.getStore.stateNames).sort(),
                    convertOld: "stringToArrayComma",
                    dropZone: ["adapterState", "chipsGroup"],
                    dragZone: "chipsGroup",
                    dropAction: (e, that, Iob) =>
                      that.doChangeValue((that.state.value || []).concat(e.dropped.stateName), e),
                    isOverProps: { style: { backgroundColor: "#C6F6C6" } },
                  },
                ],
              },
              {
                label: "States setup",
                itype: "$table",
                field: "switches",
                "dyisable-sort": true,
                cols: 12,
                items: [
                  {
                    headerName: "Name",
                    itype: "$string",
                    field: "name",
                    align: "left",
                    rules: ["uniqueTableRule", "onlyWords"],
                    sortable: true,
                    defaultValue: "newName",
                    width: "auto",
                  },
                  {
                    headerName: "On",
                    itype: "$chips",
                    field: "on",
                    align: "left",
                    clickable: true,
                    sortable: false,
                    width: "45%",
                    iselect: ($, props, Iob) => Object.keys(Iob.getStore.stateNames).sort(),
                    dropZone: ["adapterState", "chipsGroup"],
                    dragZone: "chipsGroup",
                    dropAction: (e, that, Iob) =>
                      that.doChangeValue((that.state.value || []).concat(e.dropped.stateName), e),
                    isOverProps: { style: { backgroundColor: "#C6F6C6" } },
                    convertOld: "stringToArrayComma",
                  },
                  {
                    headerName: "Off",
                    itype: "$chips",
                    field: "off",
                    clickable: true,
                    align: "center",
                    sortable: false,
                    width: "auto",
                    iselect: ($, props, Iob) => Object.keys(Iob.getStore.stateNames).sort(),
                    dropZone: ["adapterState", "chipsGroup"],
                    dropAction: (e, that, Iob) =>
                      that.doChangeValue((that.state.value || []).concat(e.dropped.stateName), e),
                    isOverProps: { style: { backgroundColor: "#C6F6C6" } },
                    convertOld: "stringToArrayComma",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        label: "Learn",
        icon: "settings_remote",
        tooltip: "learn and manage learned functions of RM devices",
        items: [
          {
            label: "Adapter Settings",
            itype: "$text",
            variant: "body2",
            lvariant: "subtitle2",
            cols: 1,
          },
          {
            label: "set Adapter log",
            itype: "$select",
            field: "$undefined",
            iselect: "debug|info|warning|error|silly",
            onClick:
              "{Iob.connection.extendObject(Iob.getStore.instanceId,{common: {loglevel: value}});}",
            convertOld: "Iob.getStore.instanceConfig.common.loglevel",
            hint: "change loglevel for adapter - will restart adapter!",
            prependIcon: "playlist_add_check",
            cols: 2,
          },
          /*           {
            label: "set running log level",
            itype: "$select",
            vdivider: "start",
            field: "logLevel",
            iselect: "||debug|info|warning|error|silly",
            onClick: "{Iob.setStateValue('.logLevel', value)}",
            convertOld: "Iob.getStateValue('.logLevel')",
            hint: "change loglevel within running adapter",
            prependIcon: "grading",
            disabled: (props, Iob) => !Iob.getStore.adapterStatus.alive,
            cols: 2,
          },
          {
            itype: "$divider",
          },
*/
          {
            label: "Poll time",
            itype: "$number",
            hint: "Poll devices every (15 - 300) seconds, 0 = no polling",
            field: "poll",
            min: 15,
            max: 300,
            zero: true,
            fixed: true,
            prependIcon: "hourglass_empty",
            defaultValue: "30",
            cols: 3,
            xl: 2,
          },
          {
            label: "Password",
            itype: "$password",
            hint:
              "password length 8-40 chars, at least one lower and uppercase, one special character and one number",
            rules: [
              "{return typeof $ === 'string' && $.length>=8 || t('should be at least 8 letters long!')}",
              {
                regexp: "/((?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^\\w\\s]).{8,40})/",
                message:
                  "need to include one lower case, one upper case, one number and one special character at least 8 and maximal 40 characters long!",
              },
            ],
            placeholder: "enter password here",
            field: "password",
            prependIcon: "vpn_key",
            cols: 3,
            fullWidth: true,
            xl: 2,
          },
          {
            label: "Text Label",
            itype: "$text",
            vdivider: "start",
            hideItem: "return !!Iob.getStateValue('._NewDeviceScan')",
            text: "Text is this",
            html: [
              "!not translated because it starts with !",
              "html=t<b>h</b>is, ",
              '!<code>&nbsp;"and this is code".slice(1)&nbsp;</code><br>',
            ],
            variant: "body2",
            lvariant: "h6",
            cols: 2,
          },
          {
            itype: "$text",
            field: "poll",
            variant: "body2",
            noGrid: true,
          },
          {
            itype: "$ilist",
            items: [
              {
                itype: "$icon",
                icon: "translate",
                size: "small",
                spaces: 20,
              },
              {
                itype: "$icon",
                icon: "settings_remote",
                size: "small",
              },
            ],
          },
          {
            itype: "$icon",
            icon: "translate",
            size: "large",
            dropZone: "adapterState",
            dropAction: (e, that, Iob) =>
              Iob.logSnackbar(
                "info;dropped Value '{0}' of {1}",
                e.dropped.stateName,
                JSON.stringify(e)
              ),
            isOverProps: { style: { backgroundColor: "#C6F6C6" } },
            //            canDropHere: (e, that, Iob) => that.testRules(e.dropped.stateName) === true,

            color: "error",
            tooltip:
              "This is a testicon, you may click on it and copy not implemented translations to clipboard",
            onClick:
              "{Iob.logSnackbar('info;!copyToClipboard {0}', Iob.copyToClipboard(Iob.notFoundI18n));}",
            noGrid: true,
          },
          /*           {
            itype: "$divider",
          },
 */

          {
            label: "Use specific interface",
            itype: "$select",
            iselect: ($, props, Iob) =>
              Iob.getStore.ipAddresses
                .filter((i) => i.family == "ipv4")
                .concat({ address: "", name: "" })
                .map((i) => ({ value: i.address, label: i.name })),
            hint: "IP interface to use, default 0.0.0.0 for all",
            field: "interface",
            defaultValue: "0.0.0.0",
            multiple: false,
            prependIcon: "router",
            cols: 4,
            xl: 3,
          },
          {
            label: "Define Unknown Type",
            itype: "$chips",
            clickable: true,
            vdivider: "start",
            hint: "Add new device type like `0x12ab=RM4`",
            field: "new",
            prependIcon: "library_add",
            minWidth: "240px",
            rules: [
              {
                //                regexp: "/^((0x)?[0-9a-f]+=[0-9a-z]+)*$/i",
                regexp: /^((0x)?[0-9a-f]+=[0-9a-z]+)*$/i,
                message: "Need to be something like 0x12ab=RMP for `{0}`",
              },
            ],
            cols: 4,
            convertOld: "stringToArrayComma",
            xl: 3,
          },
          {
            label: "encryptedFields",
            itype: "$chips",
            //            dropZone: ["adapterState","chipsGroup"],
            dropZone: ["adapterState", "chipsGroup"],
            dragZone: "chipsGroup",
            dropAction: (e, that, Iob) => {
              const test = that.testRules(e.dropped.stateName);
              //              console.log("dropAction", e, that, test);
              test == true
                ? that.doChangeValue(that.state.value.concat(e.dropped.stateName).sort(), e)
                : Iob.logSnackbar(
                    "warning;dropped Value '{0}' invalid because of {1}",
                    e.dropped.stateName,
                    test
                  );
            },
            isOverProps: { style: { backgroundColor: "#C6F6C6" } },
            canDropHere: (e, that, Iob) =>
              that.testRules(e.value) === true && that.state.value.indexOf(e.value) < 0,
            hint: "Enter field names which should be encrypted in config",
            vdivider: "start",
            field: "encryptedFields",
            iselect: ($, props, Iob) =>
              Object.keys(props.inative).filter((i) => typeof props.inative[i] === "string"),
            prependIcon: "enhanced_encryption",
            hideItem: "!this.props.inative.debug",

            freeSolo: false,
            clickable: false,
            disableClearable: true,
            fullWidth: true,
            rules: [
              ($, t, that) => {
                if (!Array.isArray($)) $ = [$];
                const names = Object.keys(that.props.inative).filter(
                  (i) => typeof that.props.inative[i] === "string"
                );
                return (
                  $.filter((i) => names.indexOf(i) < 0).length == 0 ||
                  t("need to be one of the inative field names!")
                );
              },
              {
                regexp: "/^[_$\\w]*$/i",
                message: "Need to be native field name",
              },
            ],
            convertOld: "stringToArrayComma",
            cols: 3,
          },
          {
            itype: "$divider",
          },
          {
            label: "Debug mode",
            itype: "$switch",
            field: "debug",
            tooltip: "Switch debug mode of adapter on or off",
            prependIcon: "bug_report",
            color: "secondary",
            cols: 2,
          },
          {
            itype: "$checkbox",
            label: "debug",
            field: "debug",
            tooltip: "test Checkbox debug mode of adapter on or off",
            labelPlacement: "start",
            prependIcon: "bug_report",
            colorx: "error",
            cols: 2,
          },
          {
            label: "Start Device Scan",
            itype: "$button",
            tooltip: "Start a complete device scan",
            field: "debug",
            onClick: "{Iob.sendTo(null,'device_scan','.');}",
            disabled: "!Iob.getStore.adapterStatus.alive || !!Iob.getStateValue('._NewDeviceScan')",
            onStateChange:
              "{if (e.message.id.endsWith('._NewDeviceScan')) {Iob.logSnackbar('info;'+ (!!e.message.state.val ? 'start device scan now' : 'finished device scan'));} }",
            icon: "perm_scan_wifi",
            size: "large",
            //            receivedFile: (a, b) => console.log("receivedFile", a, b),
            variant: "contained",
            cols: 2,
          },
          {
            label: "debug",
            itype: "$rbutton",
            field: "debug",
            color: "primary",
            variant: "contained",
            tooltip: "change debug mode of adapter",
            cols: 1,
          },
          /*           {
            label: "Learn RM4",
            itype: "$button",
            tooltip: "Learn IR code on Broadlink RM4",
            field: "debug",
            onClick:
              "{Iob.commandSend('setState','broadlink2.0.RM:RM4-4f-a8-08._Learn', true);Iob.logSnackbar('warning;set state {0}','.RM:RM4-4f-a8-08._Learn');}",
            disabled: "!Iob.getStore.adapterStatus.alive",
            onStateChange:
              "{if (e.message.id.endsWith('.RM:RM4-4f-a8-08._Learn')) {Iob.logSnackbar('info;'+ (!!e.message.state.val ? 'Start learning now, plese press button on remote!' : 'finished learning'));} }",
            icon: "touch_app",
            size: "large",
            variant: "contained",
            cols: 1,
          },
 */
          {
            label: "Display Language",
            itype: "$select",
            iselect: ($, props, Iob) => Object.keys(Iob.getStore.translations),
            field: "$undefined",
            convertOld: ($, props, Iob) => Iob.getStore.displayLanguage,
            onClick: (e, v, Iob) => Iob.changeLanguage(e.target.value),
            hint: "select display language",
            native: true,
            multiple: false,
            prependIcon: "router",
            cols: 2,
            xl: 2,
          },
          {
            label: "Multiline",
            itype: "$string",
            size: "small",
            margin: "dense",
            multiline: true,
            hint: "maybe multiline works!",
            placeholder: "try to enter Text here",
            defaultValue: "TestText",
            cols: 2,
          },
          {
            label: "Learn RM..PLUS",
            itype: "$state",
            name: ".RM:RMPROPLUS._Learn",
            cols: 1,
          },

          {
            itype: "$stateBrowser",
            dragZone: "adapterState",
            pageSize: 25,
            idDragDrop: {},
            cols: 6,
          },
          {
            itype: "$grid",
            spacing: 1,
            cols: 6,
            items: [
              {
                label: "Learn RM..Plus",
                itype: "$button",
                icon: "smart_button",
                tooltip: "Learn IR code on Broadlink RMProPlus",
                field: "$undefined",
                onClick: (e, props, Iob) => {
                  Iob.setStateValue(".RM:RMPROPLUS._Learn", true);
                  Iob.logSnackbar("warning;set state {0}", ".RM:RMPROPLUS._Learn");
                },
                disabled: "!Iob.getStore.adapterStatus.alive",
                cols: 3,
              },
              {
                label: "send sql.0",
                itype: "$button",
                field: "$undefined",
                icon: "perm_data_setting",
                onClick: (e, value, Iob) => {
                  //            Iob.sendTo("sql.0", "query", "SELECT * FROM datapoints").then((x) =>
                  Iob.sendTo("sql.0", "getEnabledDPs").then((x) =>
                    Iob.logSnackbar(`;!sql result for 'getEnabledDPs'=${JSON.stringify(x)}`)
                  );
                },
                /*                
                onClick: (e, value, Iob) => {
                  //            Iob.sendTo("sql.0", "query", "SELECT * FROM datapoints").then((x) =>
                  Iob.commandReceiveNoErr(
                    "sendToHost",
                    Iob.getStore.instanceConfig.common.host,
                    "getHostInfoShort",
                    {}
                  ).then((x) =>
                    Iob.logSnackbar(";!gethostinfo result=" + JSON.stringify(x))
                  );
                },
                

                onClick: (e, value, Iob) => {
                  //            Iob.sendTo("sql.0", "query", "SELECT * FROM datapoints").then((x) =>
                  Iob.sendToHost(undefined, "getRepository", {
                    repo: Iob.getStore.systemConfig.common.activeRepo,
                  }).then((x) =>
                    Iob.logSnackbar(
                      ";!gethostinfo result=" +
                        JSON.stringify(Object.entries(x).slice(0, 1))
                    )
                  );
                },
    */
                cols: 3,
              },
              {
                label: "cmdExec",
                itype: "$button",
                field: "$undefined",
                icon: "perm_data_setting",
                onClick: (e, value, Iob) => {
                  //            Iob.sendTo("sql.0", "query", "SELECT * FROM datapoints").then((x) =>
                  // Iob.sendToHost(undefined, "getInstalled", {}).then((x) =>
                  //   Iob.logSnackbar(
                  //     ";!" + JSON.stringify(Object.entries(x).slice(0, 2))
                  //   )
                  // );
                  Iob.showDialog("commandDialog", {
                    cmd: " ",
                    progressText: "Run ioBroker command",
                  });
                },
                cols: 3,
              },
              {
                label: "WifiLampe",
                itype: "$state",
                name: ".A1:EAIR1.AirQuality",
                cols: 3,
              },
              {
                itype: "$objectBrowser",
                field: "$undefined",
                label: "inative",
                convertOld: ($, props, Iob, that) => {
                  //                  console.log("ObjectBrowser", that, $, props);
                  /*                   Iob.sendToHost(undefined, "getInstalled", {}).then((x) => {
                    that.setState({ value: x });
                  });
                  return {};
 */

                  return props.inative;
                },
                cols: 12,
              },
              {
                itype: "$log",
                pageSize: 25,
                cols: 12,
              },
            ],
          },

          {
            itype: "$object",
            field: "testObject",
            hideItem: true,
            cols: 7,
            items: [
              {
                label: "Poll time",
                itype: "$number",
                hint: "Poll devices every (15 - 300) seconds, 0 = no polling",
                field: "poll",
                min: 15,
                max: 300,
                zero: true,
                fixed: true,
                fullWidth: true,
                prependIcon: "hourglass_empty",
                defaultValue: "30",
                cols: 6,
              },
              {
                label: "Password",
                itype: "$password",
                hint: "password with minimal 5 letter length",
                rules: [
                  "{return typeof $ === 'string' && $.length>=8 || t('should be at least 8 letters long!')}",
                  {
                    regexp: "/((?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^\\w\\s]).{8,40})/",
                    message:
                      "need to include one lower case, one upper case, one number and one special character at least 8 and maximal 40 characters long!",
                  },
                ],
                placeholder: "enter password here",
                field: "password",
                prependIcon: "vpn_key",
                fullWidth: true,
                cols: 6,
              },
            ],
          },
          {
            itype: "$divider",
          },
          {
            label: "Device list",
            itype: "$table",
            field: "devList",
            icon: "format_list_bulleted",
            disableSort: true,
            pageSize: 10,
            cols: 12,
            xl: 6,
            items: [
              {
                headerName: "Name",
                itype: "$string",
                field: "name",
                align: "left",
                rules: [
                  "uniqueTableRule",
                  {
                    regexp: "/^[\\w\\$@/:-]+$/i",
                    message: "Only letters, numbers and `$ @ / : _ -` are allowed",
                  },
                ],
                sortable: true,
                defaultValue: "newName",
                class: "text-body-2",
                width: "16%",
              },
              {
                headerName: "IP address",
                itype: "$string",
                field: "ip",
                width: "12%",
                class: "text-body-2",
                rules: [
                  {
                    regexp: "/^([0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+)?$/",
                    message: "Need to be an IPv4 address (like 11.22.33.44)",
                  },
                ],
              },
              {
                headerName: "Mac address",
                itype: "$string",
                field: "mac",
                width: "12%",
                class: "text-body-2",
                rules: [
                  {
                    regexp: "/^(([\\dA-F]{2}:){5}[\\dA-F]{2})?$/i",
                    message: "Need to be a mac address (like 01:23:45:56:78:9a)",
                  },
                ],
              },
              {
                headerName: "Poll",
                itype: "$checkbox",
                field: "poll",
                align: "center",
                tooltip: "enable device poll",
                sortable: false,
                width: "3%",
                convertOld: "(this.props.value || this.props.value===undefined)",
                color: "primary",
              },
              {
                headerName: "Here",
                itype: "$checkbox",
                field: "$undefined",
                align: "center",
                ieval:
                  "{this.state.value = Iob.getStateValue('.'+this.props.inative.name + '._notReachable')===false;}",
                convertOld:
                  "{return undefined; val = Iob.getStateValue('.'+this.props.inative.name + '._notReachable')===false; return val;}",
                sortable: false,
                width: "5%",
                disabled: true,
                color: "secondary",
              },
              {
                headerName: "State",
                itype: "$state",
                align: "center",
                ieval: "{items.name = '.'+this.props.inative.name;}",
                sortable: false,
                color: "secondary",
                width: "5%",
                style: { width: 100 },
              },
              {
                headerName: "Info",
                itype: "$text",
                field: "info",
                width: "40%",
                disabled: true,
                class: "text-caption",
                style: { fontSize: "12px" },
              },
            ],
          },
        ],
      },
      {
        label: "Log",
        icon: "speaker_notes",
        hideItem: "!this.props.inative.debug",
        items: [
          {
            itype: "$log",
            pageSize: 25,
            cols: 12,
          },
        ],
      },
      {
        label: "Adapters",
        //        hideItem: "!this.props.inative.debug",
        tooltip: "only for Test",
        icon: "view_list",
        //        hideItem: "!this.props.inative.debug",
        items: [
          /*           {
            itype: "$log",
            pageSize: 25,
            cols: 12,
          },
 */
        ],
      },
    ],
    translation: {
      getMissing: {
        en: "Missing text",
        de: "FehlendeTexte",
      },
      Enabled: {
        en: "Enabled",
        de: "Aktiviert",
      },
    },
    readme: {
      en: "README.md",
    },
  };
}
module.exports = config;
config();
