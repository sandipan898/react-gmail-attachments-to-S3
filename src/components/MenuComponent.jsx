import React, { useEffect } from "react";
import { Button } from "react-bootstrap";
import GmailAttachments from "./GmailAttachments/gmailAttachments";
import OutlookAttachments from "./OutlookAttachments/outlookAttachments";
import CheckboxRenderer from "./helpers/checkboxRenderer";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/dist/styles/ag-grid.css";
import "ag-grid-community/dist/styles/ag-theme-fresh.css";
import "ag-grid-community";
import { makeStyles } from "@material-ui/core/styles";
import * as AWS from "aws-sdk";

import {
    getAuthStatus,
    getAttachment,
    handleGAuth,
} from "./GmailAttachments/helpers/gmailHelper";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TablePagination from '@mui/material/TablePagination';
import Checkbox from '@mui/material/Checkbox';

/**
 * props required:-
 * 1. showUploadModal:  a boolean variable used to control modal displayed
 * 2. onCloseUploadFileModal: a post-processing function to be run after uploading file and for closing the modal
 * 3. bucketName: s3 bucket name
 * 4. folderName: s3 folder name
 * 5. acceptSingle: allows only sigle file upload
 */

const useStyles = makeStyles((theme) => ({
    addTemplateButton: {
        width: "200px",
        background: "#008ED5",
        borderRadius: "11px",
        opacity: "1",
        textAlign: "center",
        font: "normal normal bold 16px/20px Segoe UI",
        letterSpacing: "0px",
        color: "#FFFFFF",
        textTransform: "none",
        '&:hover': {
            background: "#FFFFFF",
            color: "#FFFFFF",
        },
    },
    textBelow: {
        textAlign: "center",
        font: " normal normal normal 18px/24px Segoe UI",
        letterSpacing: "0px",
        color: " #848484",
        opacity: " 1",
        fontSize: "14px"
    }
}));

const AWS_IDENTITY_POOL_ID = process.env.REACT_APP_AWS_IDENTITY_POOL_ID
const AWS_REGION = process.env.REACT_APP_AWS_REGION


AWS.config.region = AWS_REGION; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: AWS_IDENTITY_POOL_ID
});


const UploadMenu = (props) => {
    const [showOptions, setShowOptions] = React.useState(0);
    const frameworkComponents = { CheckboxRenderer: CheckboxRenderer };
    const [selectedAttachments, setSelectedAttachments] = React.useState([]);
    const [rowData, setRowData] = React.useState([]);
    const [filterNameParam, setFilterNameParam] = React.useState([]);
    const [isFilterApplied, setIsFilterApplied] = React.useState(false);
    const [filteredData, setFilteredData] = React.useState([]);
    // eslint-disable-next-line no-unused-vars
    const [loader, setLoader] = React.useState(false);
    const defaultColDef = { resizable: true, filter: true };
    const acceptSingle = props.acceptSingle || false;
    // const AwsService = new UploadMenuHelperAwsService();

    const folderName = process.env.REACT_APP_GMAIL_INGESTION_BUCKET || '';
    const bucketName = process.env.REACT_APP_BUCKET_INPUT_FOLDER || '';

    const classes = useStyles();

    const onDrop = React.useCallback((acceptedFiles) => {
        // console.log("acceptedFiles >> ",acceptedFiles);
        setFiles(acceptedFiles);
    }, []);
    // const { getRootProps, isDragActive } = useDropzone({
    //     onDrop,
    //     //   accept: 'application/pdf'
    // });
    const [files, setFiles] = React.useState([]);
    const [droppedFile, setDroppedFile] = React.useState([]);

    const [order, setOrder] = React.useState('asc');
    const [orderBy, setOrderBy] = React.useState('calories');
    const [selected, setSelected] = React.useState([]);
    const [page, setPage] = React.useState(0);
    const [dense, setDense] = React.useState(false);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

    const columnDefs = [
        {
            headerName: "Selection",
            width: 100,
            filter: false,
            field: "selection",
            cellRenderer: "CheckboxRenderer",
        },
        {
            headerName: "Attachment",
            field: "filename",
            cellStyle: { display: "flex", justifyContent: "flex-start" },
            filter: true,
            sortable: true,
            resizable: true,
            editable: false,
            width: 200,
        },
        {
            headerName: "Date",
            field: "date",
            cellStyle: { display: "flex", justifyContent: "flex-start" },
            cellRendererFramework: (params) => {
                return (
                    <div>{`${params.data.date.getFullYear()}/${params.data.date.getMonth() + 1
                        }/${params.data.date.getDate()}`}</div>
                );
            },
            filter: true,
            sortable: true,
            resizable: true,
            editable: false,
            width: 200,
        },
        {
            headerName: "View",
            field: "",
            width: 100,
            cellRendererFramework: (params) => {
                // console.log("params >> ", params);

                return (
                    <i
                        onClick={(e) => {
                            openAttachment(params.data);
                        }}
                        className="fas fa-flag fa-stack-1x fa-eye fa-inverse"
                        style={{ color: "#0075af", cursor: "pointer" }}
                    ></i>
                );
                // return <p onClick={() => goToAnalysisFiles(params)}>{params.data[params.colDef.field]}</p>
                // <span><i className="fas fa-edit highlightIconStyle" onClick={() => goToAnalysisFiles(params)}></i></span>
            },
        },
    ];

    React.useEffect(() => {
        //sign-out gmail user on closing of modal
        return () => {
            if (getAuthStatus()) handleGAuth(false);
        };
    }, []);

    const cellClick = (e) => {
        console.log(e.data);
        if (e.colDef.field === "selection") {
            const booleanValue = e.data[e.colDef.field];
            let selectedRows = JSON.parse(JSON.stringify(selectedAttachments));
            // console.log("event other delete column >> ",e, selectedRows);
            if (!booleanValue) {
                selectedRows = selectedRows.filter((row) => {
                    return row.rowIndex !== e.rowIndex;
                });
            } else {
                if (
                    selectedRows.length &&
                    selectedRows.some((row) => row.rowIndex === e.rowIndex)
                ) {
                    selectedRows = selectedRows.map((row) => {
                        if (row.rowIndex === e.rowIndex) {
                            return { ...row, [e.colDef.field]: true };
                        }
                        return { ...row };
                    });
                } else {
                    selectedRows.push({ ...e.data, rowIndex: e.rowIndex });
                    // console.log("deleteRows >> ",{...e.data, rowIndex : e.rowIndex },deleteRows,booleanValue);
                }
            }
            //console.log("deleteRowsData >> ",deleteRows);
            console.log("selected rows >>>", selectedRows);
            setSelectedAttachments(selectedRows);
        }
    };
    useEffect(() => {
        // console.log("printing the event on call upload ", "DemoUser1" + new Date());
        // console.log("this is event", files);
        if (files.length === 1) {
            setDroppedFile(files[0]);

            // uploadFile(files[0]);
        } else {
            console.log(
                "Either files length is 0 or more than 1 , Please select 1 file only!!"
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [files]);

    useEffect(() => {
        // console.log("printing the event on call upload ", "DemoUser1" + new Date());
        // console.log("this is event", files);
        if (Object.keys(droppedFile).length !== 0)
            // uploadFile(droppedFile);
            console.log("droppedFile", droppedFile);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [droppedFile]);

    const uploadFile = async () => {
        console.log("uploadFile selectedAttachments>> ", selectedAttachments, selected);
        let timeStamp = Number(new Date());
        let dateTime = new Date(timeStamp).toGMTString();
        setLoader(true);
        let promiseArray = [];
        selected.forEach((file) => {
            let name = file.filename.substring(0,
                file.filename.lastIndexOf(".")
            );
            let base64FileAttachment = "",
                fileType = "";
            //for gmail attachments
            if (showOptions === 1) {
                base64FileAttachment = getAttachment(
                    file.body.attachmentId,
                    file.messageId
                );
                fileType = file.mimeType.split("/")[1];
            }
            //for outlook attachments
            else if (showOptions === 2) {
                base64FileAttachment = file.contentBytes;
                fileType = file.contentType.split("/")[1];
            }

            console.log("base64FileAttachment", base64FileAttachment)

            // promiseArray.push(
                // uploadFileToS3(
                //     file,
                //     fileType,
                //     folderName,
                //     `${bucketName}/` + file.title
                // )
            // );
        });

        Promise.all(promiseArray)
            .then((res) => {
                setLoader(false);
                console.log("all the files uploaded successfully !!");
            })
            .catch((err) => {
                setLoader(false);
                console.log("some error in uploading files");
            });
    };

    // const uploadFileToS3 = (file, url, fileExtension, mimeType, bucket, key) => {
    //     try {
    //         let adBucketName = process.env.REACT_APP_ANALYZE_DOCUMENTS_BUCKET;
    //         let adFolderName = `${process.env.REACT_APP_BUCKET_INPUT_FOLDER}/${dateTime}`;
    //         await AwsService.uploadBase64FileToS3(
    //             adBucketName,
    //             adFolderName,
    //             base64FileAttachment,
    //             name,
    //             fileType
    //         )
    //             .then(async (res) => {
    //                 alert(
    //                     `Document - ${attachment.filename} uploaded successfully. Processing started... Please wait...`,
    //                     3000
    //                 );
    //             })
    //             .catch((error) => {
    //                 setLoader(false);
    //                 console.log(
    //                     "some error occured while file upload >> ",
    //                     error
    //                 );
    //                 alert(
    //                     `Some error occured while uploading Document - ${attachment.filename}`,
    //                     2500
    //                 );
    //             });

    //     } catch (error) {
    //         setLoader(false);
    //         console.log("some error occured while file upload >> ", error);
    //         alert(
    //             `Some error for Document - ${selectedAttachments[0].filename}`,
    //             2500
    //         );
    //     }

    // };

    const openAttachment = async (attachment) => {
        let pdfString = "";
        if (showOptions === 1) {
            pdfString = await getAttachment(
                attachment.body.attachmentId,
                attachment.messageId
            );
            if (pdfString === "Error") {
                alert(`Couldn't fetch attachment!`, 3000);
                return;
            } else {
                let pdfWindow = window.open("");
                setTimeout(() => {
                    pdfWindow.document.write(
                        "<iframe width='100%' height='100%' src='data:" +
                        attachment.mimeType +
                        ";base64," +
                        pdfString +
                        "'></iframe>"
                    );
                }, 100);
            }
        } else if (showOptions === 2) {
            pdfString = attachment.contentBytes;
            let pdfWindow = window.open("");
            setTimeout(() => {
                pdfWindow.document.write(
                    "<iframe width='100%' height='100%' src='data:" +
                    attachment.contentType +
                    ";base64," +
                    pdfString +
                    "'></iframe>"
                );
            }, 100);
        }
        console.log("pdfstring>>", pdfString);
    };

    const changeHandler = (e) => {
        //console.log(e.target.value);
        let nameParam = e.target.value;
        setFilterNameParam(nameParam);
        if (nameParam.length === 0) {
            setIsFilterApplied(false);
        } else {
            const dataFiltered = rowData.filter((data) =>
                data.filename.toLowerCase().includes(nameParam.toLowerCase())
            );
            setFilteredData(dataFiltered);
            setIsFilterApplied(true);
        }
    };
    const callUpload = (event) => {
        const files = event.target.files;
        setFiles(files);
        document.getElementById("getFile").click();
    };

    const data = isFilterApplied ? filteredData : rowData
    console.log("Final Data: ", data);

    const handleSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelecteds = rowData.map((n) => n);
            setSelected(newSelecteds);
            console.log("handleSelectAllClick", newSelecteds);
            return;
        }
        setSelected([]);
    };

    const handleClick = (event, name) => {
        const selectedIndex = selected.indexOf(name);
        let newSelected = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, name);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleChangeDense = (event) => {
        setDense(event.target.checked);
    };

    const isSelected = (name) => selected.indexOf(name) !== -1;

    // Avoid a layout jump when reaching the last page with empty rows.
    const emptyRows =
        page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rowData.length) : 0;

    console.log("Selected", selected);

    return (
        <div>

            {
                // showOptions !== 0 ?
                //     <div className="row" style={{ justifyContent: "space-between", width: "85%", margin: "0 auto" }}>
                //         {/* <div className="col-md-4"></div> */}
                //         <div className="col-md-3 mb-2" style={{ marginTop: "30px", alignItems: "center", paddingLeft: "0", paddingRight: "0" }}>
                //             <Button className="btn button-style btn-sm"
                //                 style={{
                //                     height: "33px",
                //                     cursor: "pointer",
                //                     display: "flex",
                //                     margin: "10px 10px 10px 0",
                //                     border: "1px solid #229FFF",
                //                     backgroundColor: "#FFFFFF",
                //                     color: "#000000",
                //                     width: "fit-content"
                //                 }}
                //                 onClick={(e) => { setShowOptions(0) }}>
                //                 <i className="fas fa-arrow-circle-left" style={{ margin: "auto", paddingRight: "5px" }}></i> Back
                //             </Button>
                //         </div>
                //         <div className="col-md-6 input-group mb-2" style={{ marginTop: "30px", alignItems: "center", paddingLeft: "0", paddingRight: "0" }}>
                //             <input type="text" className="form-control" placeholder="Search Attachments" onChange={changeHandler}
                //                 value={filterNameParam} />
                //             <div className="input-group-append">
                //                 <button className="btn hi" type="button" style={{ backgroundColor: "#008ED5", opacity: "1", }}>
                //                     <i className="fa fa-search" style={{ color: "white" }}></i>
                //                 </button>
                //             </div>
                //         </div>

                //     </div> : null
            }

            {showOptions === 0 ? (
                <div className="row">
                    <div className="col-md-12" style={{ textAlign: "center" }}>
                        <GmailAttachments
                            setShowOptions={setShowOptions}
                            setRowData={setRowData}
                        />
                        <b style={{ margin: "10px" }}>(or)</b>
                        <OutlookAttachments
                            setShowOptions={setShowOptions}
                            setRowData={setRowData}
                        />
                    </div>
                </div>
            ) : null}

            {
                (showOptions !== 0) ?
                    <div id="adminPage--CollapeTable-Grid" className="ag-theme-material">
                        {rowData.length > 0 ?
                            (<>
                                {/* <React.Fragment>
                                    <AgGridReact
                                        columnDefs={columnDefs}
                                        defaultColDef={defaultColDef}
                                        debug={true}
                                        rowSelection='multiple'
                                        paginationPageSize={8}
                                        onCellClicked={cellClick}
                                        pagination={true}
                                        rowData={isFilterApplied ? filteredData : rowData}
                                        frameworkComponents={frameworkComponents}
                                    />
                                </React.Fragment> */}
                                {/* <>
                                    <DataGrid
                                        rows={isFilterApplied ? filteredData : rowData}
                                        columns={columnDefs}
                                        pageSize={5}
                                        rowsPerPageOptions={[5]}
                                        checkboxSelection
                                    />
                                </> */}
                            </>
                            )
                            : null}
                        {/* {data.map(({ partId, mimeType, filename, headers, body, date, messageId }) => (
                            <div key={body.attachmentId}>{filename}</div>

                        ))} */}
                        <Paper>
                            <TableContainer component={Paper}>
                                <Table sx={{ minWidth: 650 }} aria-label="simple table" checkboxSelection>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    color="primary"
                                                    // indeterminate={numSelected > 0 && numSelected < rowCount}
                                                    checked={rowData.length > 0 && selected.length === rowData.length}
                                                    onChange={handleSelectAllClick}
                                                    inputProps={{
                                                        'aria-label': 'select all desserts',
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>Attachment Name</TableCell>
                                            <TableCell align="right">Date</TableCell>
                                            <TableCell align="right">File Type</TableCell>
                                            {/* <TableCell align="right">Carbs&nbsp;(g)</TableCell> */}
                                            {/* <TableCell align="right">Protein&nbsp;(g)</TableCell> */}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.map((row, index) => {
                                            const isItemSelected = isSelected(row);
                                            const labelId = `enhanced-table-checkbox-${index}`;
                                            return (
                                                <TableRow
                                                    key={row.body.attachmentId}
                                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                    hover
                                                    onClick={(event) => handleClick(event, row)}
                                                    role="checkbox"
                                                    aria-checked={isItemSelected}
                                                    tabIndex={-1}
                                                    selected={isItemSelected}
                                                >
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            color="primary"
                                                            checked={isItemSelected}
                                                            inputProps={{
                                                                'aria-labelledby': labelId,
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell component="th" scope="row">
                                                        {row.filename}
                                                    </TableCell>
                                                    <TableCell align="right">{row.date.getFullYear()}/{row.date.getMonth() + 1}/{row.date.getDate()}</TableCell>
                                                    <TableCell align="right">{row.mimeType}</TableCell>
                                                    {/* <TableCell align="right">{row.carbs}</TableCell> */}
                                                    {/* <TableCell align="right">{row.protein}</TableCell> */}
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={data.length}
                                rowsPerPage={5}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </Paper>
                    </div>
                    :
                    null
            }

            <Button onClick={uploadFile}>Migrate to S3</Button>
        </div >
    );
};

export default UploadMenu;
